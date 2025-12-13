import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Eye } from "lucide-react";
import { getWebsiteBySlug } from "@/hooks/useWebsites";
import type { Json } from "@/integrations/supabase/types";

const fallbackImage = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop";

interface WebsiteDetailModalProps {
  website: {
    id: string;
    title: string | null;
    slug: string | null;
    created_at: string;
    json_data: Json | null;
    preview_image_url?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDetailModal({ website, isOpen, onClose }: WebsiteDetailModalProps) {
  const [fullWebsite, setFullWebsite] = useState<any>(null);

  useEffect(() => {
    async function load() {
      if (!website?.slug) return;
      try {
        const data = await getWebsiteBySlug(website.slug);
        setFullWebsite(data);
      } catch (e) {
        console.error("Failed to load website details:", e);
      }
    }

    if (isOpen) load();
  }, [isOpen, website?.slug]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {website.title || "Website"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Preview image */}
          <motion.div
            className="rounded-xl overflow-hidden exhibit-card aspect-[16/9]"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
          >
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${website.preview_image_url || fallbackImage})`,
              }}
            />
          </motion.div>

          {/* Metadata */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Slug:</strong> {website.slug || "none"}</p>
            <p><strong>Created:</strong> {new Date(website.created_at).toLocaleString()}</p>
          </div>

          {/* JSON content summary */}
          {fullWebsite?.json_data && (
            <div className="bg-secondary/40 p-4 rounded-xl border border-border/40">
              <p className="font-semibold mb-2 text-sm">Generated Content</p>
              <pre className="text-xs whitespace-pre-wrap opacity-70">
                {JSON.stringify(fullWebsite.json_data, null, 2).slice(0, 600)}…
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>

            {website.slug && (
              <Button
                variant="coral"
                onClick={() => {
                  window.open(`/site/${website.slug}`, "_blank");
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Live
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
