import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { getTemplateBySlug } from "@/data/templates";
import { TemplatePreview } from "@/components/templates/TemplatePreview";

export function TemplatePreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const template = useMemo(() => (slug ? getTemplateBySlug(slug) : undefined), [slug]);

  if (!template) return <Navigate to="/templates" replace />;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 px-6 py-4 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Preview · {template.name}
        </div>
        <a
          href={`/generator?template=${template.slug}`}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          Use Template
        </a>
      </header>

      <TemplatePreview template={template} />
    </main>
  );
}

export default TemplatePreviewPage;
