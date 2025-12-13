import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { getTemplateBySlug } from "@/data/templates";
import { Button } from "@/components/ui/button";

export function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const template = useMemo(() => (slug ? getTemplateBySlug(slug) : undefined), [slug]);

  if (!template) return <Navigate to="/templates" replace />;

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden border border-border/60 bg-background/70">
            <div className="relative aspect-[16/9] overflow-hidden">
              <img
                src={template.featureImage.src}
                alt={template.featureImage.alt}
                className="h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute top-3 right-3 text-xs rounded-full bg-background/80 px-3 py-1 border border-border/60">
                {template.category}
              </div>
            </div>
            <div className="p-6 md:p-8">
              <div className="text-xs text-muted-foreground">
                {template.tags.join(" · ")}
              </div>
              <h1 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight">
                {template.name}
              </h1>
              <p className="mt-3 text-muted-foreground">{template.excerpt}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="coral">
                  <a href={`/generator?template=${template.slug}`}>Use Template</a>
                </Button>
                <Button asChild variant="glass">
                  <a href={`/templates/${template.slug}/preview`}>Preview Template</a>
                </Button>
              </div>
            </div>
          </div>

          <div id="spec" className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/60">
              <h2 className="font-display text-2xl mb-4">Details</h2>
              <p className="text-muted-foreground leading-relaxed">{template.description}</p>
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/60">
              <h2 className="font-display text-2xl mb-4">Spec</h2>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">Industries</div>
                  <ul className="mt-2 space-y-1">
                    {template.spec.industries.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground">Tone</div>
                  <ul className="mt-2 space-y-1">
                    {template.spec.tone.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground">Pages</div>
                  <ul className="mt-2 space-y-1">
                    {template.spec.pages.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground">Components</div>
                  <ul className="mt-2 space-y-1">
                    {template.spec.components.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default TemplateDetailPage;
