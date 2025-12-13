import type { Template } from "@/lib/template.types";

export function TemplatePreview({ template }: { template: Template }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-16">
      {template.spec.components.map((component) => (
        <PreviewSection key={component} type={component} />
      ))}
    </div>
  );
}

function PreviewSection({ type }: { type: string }) {
  switch (type) {
    case "Hero":
      return (
        <section className="rounded-3xl border border-border/60 bg-background/80 p-16 text-center">
          <h1 className="text-4xl font-semibold">Hero Headline</h1>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Intentional placeholder copy to show layout intent and spacing.
          </p>
        </section>
      );
    case "Feature Grid":
      return (
        <section className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-background/70 p-6"
            >
              <div className="text-lg font-medium">Feature {i}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Descriptive copy for layout preview.
              </p>
            </div>
          ))}
        </section>
      );
    case "Pricing":
      return (
        <section className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/60 bg-background/70 p-6"
            >
              <div className="text-xl font-semibold">$XX</div>
              <p className="mt-2 text-muted-foreground">Plan {i}</p>
            </div>
          ))}
        </section>
      );
    default:
      return (
        <section className="rounded-2xl border border-dashed border-border/60 p-6 text-muted-foreground">
          {type} section
        </section>
      );
  }
}
