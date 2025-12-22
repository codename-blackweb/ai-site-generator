import { Button } from "@/components/ui/button";

type HeroSection = {
  type: "hero";
  headline: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta?: string;
};

type FeatureGridSection = {
  type: "feature_grid";
  title: string;
  subtitle?: string;
  features: {
    title: string;
    description: string;
  }[];
};

type StorySection = {
  type: "story";
  title: string;
  body: string;
};

type TestimonialsSection = {
  type: "testimonials";
  title: string;
  items: {
    quote: string;
    name: string;
    role?: string;
  }[];
};

type CtaBannerSection = {
  type: "cta_banner";
  headline: string;
  body: string;
  buttonLabel: string;
};

type FooterSection = {
  type: "footer";
  tagline: string;
  links?: { label: string; href: string }[];
};

type WebsiteSection =
  | HeroSection
  | FeatureGridSection
  | StorySection
  | TestimonialsSection
  | CtaBannerSection
  | FooterSection;

export type WebsiteSpec = {
  meta: {
    title: string;
    seoDescription: string;
    industry?: string;
    primaryGoal?: string;
    brandTone?: string;
    theme: {
      primaryColor: string;
      accentColor: string;
      background: "light" | "dark";
      suggestedFont: string;
    };
  };
  layout: {
    variant: "hero-led" | "split" | "grid" | "narrative";
    emphasis: "conversion" | "brand" | "case-study";
  };
  sections: WebsiteSection[];
};

export function WebsiteRenderer({ spec }: { spec: WebsiteSpec }) {
  const theme = spec.meta.theme;

  return (
    <main
      style={{
        background:
          theme.background === "dark" ? "#0f0f0f" : "#ffffff",
        color: theme.background === "dark" ? "#ffffff" : "#0f0f0f",
        fontFamily: theme.suggestedFont,
      }}
    >
      {spec.sections.map((section, idx) => {
        switch (section.type) {
          case "hero":
            return (
              <section
                key={idx}
                className="py-32 text-center px-6"
              >
                <h1 className="text-5xl md:text-6xl font-display mb-6">
                  {section.headline}
                </h1>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                  {section.subheadline}
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="coral" size="lg">
                    {section.primaryCta}
                  </Button>
                  {section.secondaryCta && (
                    <Button variant="outline" size="lg">
                      {section.secondaryCta}
                    </Button>
                  )}
                </div>
              </section>
            );

          case "feature_grid":
            return (
              <section key={idx} className="py-24 px-6">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-4xl font-display mb-4">
                    {section.title}
                  </h2>
                  {section.subtitle && (
                    <p className="text-muted-foreground mb-12">
                      {section.subtitle}
                    </p>
                  )}
                  <div className="grid md:grid-cols-3 gap-8">
                    {section.features.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border p-6"
                      >
                        <h3 className="text-xl font-semibold mb-2">
                          {f.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {f.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "story":
            return (
              <section
                key={idx}
                className="py-24 px-6 bg-secondary/40"
              >
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-4xl font-display mb-6">
                    {section.title}
                  </h2>
                  <p className="whitespace-pre-line text-lg">
                    {section.body}
                  </p>
                </div>
              </section>
            );

          case "testimonials":
            return (
              <section key={idx} className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-4xl font-display mb-12">
                    {section.title}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-8">
                    {section.items.map((t, i) => (
                      <blockquote
                        key={i}
                        className="border-l-4 border-primary pl-6"
                      >
                        <p className="italic mb-4">
                          “{t.quote}”
                        </p>
                        <footer className="text-sm text-muted-foreground">
                          {t.name}
                          {t.role ? ` — ${t.role}` : ""}
                        </footer>
                      </blockquote>
                    ))}
                  </div>
                </div>
              </section>
            );

          case "cta_banner":
            return (
              <section
                key={idx}
                className="py-24 px-6 text-center bg-primary text-primary-foreground"
              >
                <h2 className="text-4xl font-display mb-4">
                  {section.headline}
                </h2>
                <p className="mb-8 max-w-xl mx-auto">
                  {section.body}
                </p>
                <Button size="lg" variant="secondary">
                  {section.buttonLabel}
                </Button>
              </section>
            );

          case "footer":
            return (
              <footer
                key={idx}
                className="py-12 px-6 text-center border-t border-border"
              >
                <p className="mb-4 text-sm text-muted-foreground">
                  {section.tagline}
                </p>
                {section.links && (
                  <div className="flex justify-center gap-6 text-sm">
                    {section.links.map((l, i) => (
                      <a
                        key={i}
                        href={l.href}
                        className="hover:underline"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                )}
              </footer>
            );
        }
      })}
    </main>
  );
}
