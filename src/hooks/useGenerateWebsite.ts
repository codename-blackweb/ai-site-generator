import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface GenerateWebsitePayload {
  projectName: string;
  description: string;
}

export function useGenerateWebsite() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateWebsite = useCallback(async (payload: GenerateWebsitePayload) => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-website", {
        body: {
          projectName: payload.projectName,
          goal: payload.description,
        },
      });

      if (fnError) throw fnError;

      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }

      const generated = (data as any)?.generatedContent;
      if (!generated) {
        throw new Error("No website content was returned from the generator.");
      }

      return generated;
    } catch (err: any) {
      const message = err?.message ?? "Website generation failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateWebsite,
    isGenerating,
    error,
  };
}
