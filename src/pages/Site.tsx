import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getWebsiteBySlug } from "@/hooks/useWebsites";
import { Loader2 } from "lucide-react";

type WebsiteContent = {
  hero?: {
    headline?: string;
    subheadline?: string;
    ctaPrimary?: string;
    ctaSecondary?: string;
  };
  about?: {
    title?: string;
    description?: string;
  };
  features?: {
    title?: string;
    description?: string;
    icon?: string;
  }[];
  testimonials?: {
    quote?: string;
    author?: string;
    role?: string;
  }[];
  cta?: {
    headline?: string;
    description?: string;
    buttonText?: string;
  };
  footer?: {
    tagline?: string;
  };
  metadata?: {
    primaryColor?: string;
    secondaryColor?: string;
    suggestedFont?: string;
  };
};

export default function Site() {
  const { slug } = useParams<{ slug: string }>();
  const [website, setWebsite] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    getWebsiteBySlug(slug)
      .then((data) => setWebsite(data))
      .catch(() => setWebsite(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const content = useMemo((): WebsiteContent | null => {
    if (!website?.json_data) return null;
    const jd = website.json_data as any;
    return (jd.generated ?? jd) as WebsiteContent;
  }, [website]);

  const resolvedContent: WebsiteContent | null = useMemo(() => {
    if (content) return content;
    if (!website) return null;
    // Fallback content to avoid blank pages when json_data is missing
    return {
      hero: {
        headline: website.title ?? "Untitled site",
        subheadline: "Explore the experience we built.",
        ctaPrimary: "Explore",
        ctaSecondary: "Learn more",
      },
      about: {
        title: "Overview",
        description: "This site was generated with EXHIBIT. Content will appear here once generation finishes.",
      },
      features: [
        { title: "Modern layout", description: "Responsive sections ready for your story." },
        { title: "Fast setup", description: "Instant publish with AI-driven structure." },
        { title: "Customizable", description: "Tweak colors, fonts, and pages effortlessly." },
      ],
      cta: {
        headline: "Ready to make it yours?",
        description: "Regenerate with more details or start customizing.",
        buttonText: "Edit in EXHIBIT",
      },
      footer: {
        tagline: "Built with EXHIBIT",
      },
    };
  }, [content, website]);

  const accentStyle = useMemo(() => {
    const primary = resolvedContent?.metadata?.primaryColor;
    if (!primary) return {};
    return { "--accent-override": primary } as React.CSSProperties;
  }, [resolvedContent]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!website || !resolvedContent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-2xl text-muted-foreground">Website not found</h1>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground" style={accentStyle}>
      <section className="py-28 border-b border-border">
        <div className="container px-6 max-w-5xl">
          <h1 className="font-display text-5xl md:text-6xl mb-6">
            {resolvedContent.hero?.headline}
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            {resolvedContent.hero?.subheadline}
          </p>
          <div className="flex gap-4">
            {resolvedContent.hero?.ctaPrimary && (
              <a
                href="#features"
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg inline-flex items-center justify-center"
              >
                {resolvedContent.hero.ctaPrimary}
              </a>
            )}
            {resolvedContent.hero?.ctaSecondary && (
              <a
                href="#about"
                className="px-6 py-3 border border-border rounded-lg inline-flex items-center justify-center"
              >
                {resolvedContent.hero.ctaSecondary}
              </a>
            )}
          </div>
        </div>
      </section>

      {resolvedContent.about && (
        <section id="about" className="py-20">
          <div className="container px-6 max-w-4xl">
            <h2 className="text-3xl font-display mb-4">{resolvedContent.about.title}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {resolvedContent.about.description}
            </p>
          </div>
        </section>
      )}

      {resolvedContent.features?.length ? (
        <section id="features" className="py-20 bg-secondary/30">
          <div className="container px-6 max-w-6xl">
            <h2 className="text-3xl font-display mb-10">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {resolvedContent.features.map((f, i) => (
                <div key={i} className="p-6 bg-card rounded-xl border border-border">
                  <h3 className="font-semibold text-xl mb-2">{f.title}</h3>
                  <p className="text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {resolvedContent.testimonials?.length ? (
        <section className="py-20">
          <div className="container px-6 max-w-5xl">
            <h2 className="text-3xl font-display mb-10">Testimonials</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {resolvedContent.testimonials.map((t, i) => (
                <div key={i} className="p-6 bg-card rounded-xl border border-border">
                  <p className="text-lg mb-4">“{t.quote}”</p>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t.author}</span>
                    {t.role ? <span> · {t.role}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {resolvedContent.cta && (
        <section className="py-28 border-t border-border">
          <div className="container px-6 max-w-4xl text-center">
            <h2 className="text-4xl font-display mb-4">{resolvedContent.cta.headline}</h2>
            <p className="text-muted-foreground text-lg mb-8">{resolvedContent.cta.description}</p>
            <button className="px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg">
              {resolvedContent.cta.buttonText}
            </button>
          </div>
        </section>
      )}

      <footer className="py-10 border-t border-border">
        <div className="container px-6 text-sm text-muted-foreground">
          {resolvedContent.footer?.tagline ?? "Built with EXHIBIT"}
        </div>
      </footer>
    </main>
  );
}
