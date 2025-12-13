import { useMemo } from "react";
import { getFeaturedTemplates, getPublishedTemplates } from "@/data/templates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { FeaturedTemplate } from "@/components/templates/FeaturedTemplate";

export function TemplatesPage() {
  const featured = useMemo(() => getFeaturedTemplates(), []);
  const templates = useMemo(() => getPublishedTemplates(), []);
  const rest = featured.length ? templates.filter((t) => !featured.find((f) => f.id === t.id)) : templates;

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-6xl mx-auto">
          <header className="mb-10">
            <h1 className="font-display text-4xl md:text-5xl">Templates</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Production-ready starting points. Structured, opinionated, and built to ship.
            </p>
          </header>

          {featured.length > 0 && (
            <section className="mb-10 grid gap-6 md:grid-cols-2">
              {featured.map((t) => (
                <FeaturedTemplate key={t.id} template={t} />
              ))}
            </section>
          )}

          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}

export default TemplatesPage;
