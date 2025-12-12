import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Users, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateClientPortfolio } from "@/hooks/useClientPortfolios";
import { toast } from "sonner";

interface CreatePortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePortfolioModal({ isOpen, onClose }: CreatePortfolioModalProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientLogoUrl, setClientLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#e07856");
  
  const createPortfolio = useCreateClientPortfolio();

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !slug) {
      toast.error("Title and URL slug are required");
      return;
    }

    try {
      await createPortfolio.mutateAsync({
        title,
        slug,
        introduction: introduction || null,
        client_name: clientName || null,
        client_logo_url: clientLogoUrl || null,
        accent_color: accentColor || null,
        is_public: true,
      });
      
      onClose();
      setTitle("");
      setSlug("");
      setIntroduction("");
      setClientName("");
      setClientLogoUrl("");
      setAccentColor("#e07856");
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card rounded-2xl p-8 z-50"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl">Create Client Portfolio</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Portfolio Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Work for Acme Corp"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="h-12 bg-secondary/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug" className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  URL Slug
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/portfolio/</span>
                  <Input
                    id="slug"
                    placeholder="acme-corp"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-12 bg-secondary/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="introduction">Introduction</Label>
                <Textarea
                  id="introduction"
                  placeholder="A brief introduction for this portfolio..."
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  className="min-h-[100px] bg-secondary/50 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Client Name
                  </Label>
                  <Input
                    id="clientName"
                    placeholder="Acme Corp"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="h-12 bg-secondary/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accentColor" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Accent Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-12 w-14 p-1 bg-secondary/50"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-12 bg-secondary/50"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientLogo">Client Logo URL (optional)</Label>
                <Input
                  id="clientLogo"
                  placeholder="https://..."
                  value={clientLogoUrl}
                  onChange={(e) => setClientLogoUrl(e.target.value)}
                  className="h-12 bg-secondary/50"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="coral"
                  disabled={createPortfolio.isPending}
                >
                  {createPortfolio.isPending ? "Creating..." : "Create Portfolio"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
