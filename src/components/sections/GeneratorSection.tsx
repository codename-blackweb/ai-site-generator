import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useGenerateWebsite } from "@/hooks/useGenerateWebsite";
import { createWebsite, generateThumbnailForWebsite } from "@/hooks/useWebsites";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Template } from "@/lib/template.types";

type GenerationStage =
  | "idle"
  | "generating_content"
  | "saving_site"
  | "generating_thumbnail"
  | "complete"
  | "error";

interface GeneratorSectionProps {
  templatePreset?: Template;
}

export function GeneratorSection({ templatePreset }: GeneratorSectionProps) {
  const { user } = useAuth();
  const { generateWebsite, isGenerating } = useGenerateWebsite();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    projectName: "",
    goal: "",
  });
  const [stage, setStage] = useState<GenerationStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  const update = (key: "projectName" | "goal", value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (templatePreset) {
      setFormData({
        projectName: templatePreset.name,
        goal: templatePreset.generatorPayload.promptSeed || templatePreset.excerpt,
      });
    }
  }, [templatePreset]);

  const handleGenerate = async () => {
    if (stage === "complete" && createdSlug) {
      navigate(`/site/${createdSlug}`);
      return;
    }

    if (!user) {
      toast.error("Please sign in to generate a website.");
      return;
    }

    setErrorMessage(null);
    setStage("generating_content");

    try {
      const generated = await generateWebsite({
        projectName: formData.projectName,
        description: formData.goal,
      });

      setStage("saving_site");

      const slug = formData.projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      const created = await createWebsite({
        user_id: user.id,
        title: formData.projectName,
        slug,
        json_data: generated,
        is_public: true,
      });

      setCreatedSlug(created.slug || slug);

      setStage("generating_thumbnail");
      // Fire-and-forget thumbnail; never block success
      generateThumbnailForWebsite({
        websiteId: created.id,
        title: formData.projectName,
        description: formData.goal,
      }).catch((thumbErr) => {
        console.warn("Thumbnail generation failed; continuing without thumbnail.", thumbErr);
      });

      setStage("complete");
      toast.success("Website generated successfully.");
    } catch (err: any) {
      setStage("error");
      const message = err?.message ?? "Generation failed.";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  const buttonLabelMap: Record<GenerationStage, string> = {
    idle: "Generate Website",
    generating_content: "Generating structure…",
    saving_site: "Saving project…",
    generating_thumbnail: "Finalizing preview…",
    complete: "View Website",
    error: "Try Again",
  };

  const buttonDisabled = ["generating_content", "saving_site", "generating_thumbnail"].includes(stage) || isGenerating;
  const primaryLabel = buttonLabelMap[stage];

  return (
    <section id="generator" className="py-32">
      <div className="container max-w-3xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="font-display text-5xl mb-4">
            Create Instantly
          </h2>
          <p className="text-muted-foreground text-lg">
            Name it. Describe it. AI builds it.
          </p>
        </motion.div>

        <div className="glass-panel rounded-3xl p-8 space-y-8">
          <div className="space-y-3">
            <label>Project Name</label>
            <Input
              value={formData.projectName}
              onChange={(e) =>
                update("projectName", e.target.value)
              }
              placeholder="Acme Studio"
            />
          </div>

          <div className="space-y-3">
            <label>Goal</label>
            <Textarea
              value={formData.goal}
              onChange={(e) =>
                update("goal", e.target.value)
              }
              placeholder="Describe the purpose of the site…"
            />
          </div>

          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={buttonDisabled}
            className="w-full"
          >
            {buttonDisabled ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2" />}
            {primaryLabel}
          </Button>

          {stage === "error" && errorMessage && (
            <p className="text-sm text-destructive mt-2">{errorMessage}</p>
          )}
          {stage === "complete" && createdSlug && (
            <p className="text-sm text-muted-foreground mt-2">
              Site created. Click “View Website” to open it.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
