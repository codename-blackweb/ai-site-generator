import { useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useWebsiteBySlug } from "@/hooks/useWebsites";
import { Button } from "@/components/ui/button";

type GeneratedContent = {
  hero: { headline: string; subheadline?: string; ctaPrimary?: string; ctaSecondary?: string };
  about?: { title?: string; description?: string };
  features?: { title?: string; description?: string }[];
  testimonials?: { quote?: string; author?: string; role?: string }[];
  cta?: { headline?: string; description?: string; buttonText?: string };
  footer?: { tagline?: string };
  metadata?: { primaryColor?: string; secondaryColor?: string; suggestedFont?: string };
};

const fallbackContent: GeneratedContent = {
  hero: {
    headline: "Your new site is live.",
    subheadline: "This page renders AI output safely with sensible defaults.",
    ctaPrimary: "Get Started",
    ctaSecondary: "View Gallery",
  },
  about: {
    title: "About this site",
    description: "Content will adapt to the generated JSON. Missing sections fall back gracefully.",
  },
  features: [
    { title: "Responsive", description: "Looks great on all devices." },
    { title: "Curated", description: "Content is validated before render." },
    { title: "Shareable", description: "Public slug routing is enabled." },
  ],
  testimonials: [
    { quote: "A reliable way to ship AI-generated sites.", author: "EXHIBIT", role: "Platform" },
  ],
  cta: {
    headline: "Ready to build more?",
    description: "Generate another site or share this one.",
    buttonText: "Back to Home",
  },
  footer: { tagline: "Exhibit — crafted with AI" },
};

function normalizeContent(raw: any): GeneratedContent {
  if (!raw || typeof raw !== "object") return fallbackContent;

  const safeFeatures = Array.isArray(raw.features)
    ? raw.features.filter((item: any) => item && item.title).map((item: any) => ({
        title: String(item.title),
        description: item.description ? String(item.description) : "",
      }))
    : [];

  const safeTestimonials = Array.isArray(raw.testimonials)
    ? raw.testimonials.filter((item: any) => item && item.quote).map((item: any) => ({
        quote: String(item.quote),
        author: item.author ? String(item.author) : "Anonymous",
        role: item.role ? String(item.role) : "",
      }))
    : [];

  return {
    hero: {
      headline: raw.hero?.headline || fallbackContent.hero.headline,
      subheadline: raw.hero?.subheadline || fallbackContent.hero.subheadline,
      ctaPrimary: raw.hero?.ctaPrimary || fallbackContent.hero.ctaPrimary,
      ctaSecondary: raw.hero?.ctaSecondary || fallbackContent.hero.ctaSecondary,
    },
    about: {
      title: raw.about?.title || fallbackContent.about?.title,
      description: raw.about?.description || fallbackContent.about?.description,
    },
    features: safeFeatures.length > 0 ? safeFeatures : fallbackContent.features,
    testimonials: safeTestimonials.length > 0 ? safeTestimonials : fallbackContent.testimonials,
    cta: {
      headline: raw.cta?.headline || fallbackContent.cta?.headline,
      description: raw.cta?.description || fallbackContent.cta?.description,
      buttonText: raw.cta?.buttonText || fallbackContent.cta?.buttonText,
    },
    footer: {
      tagline: raw.footer?.tagline || fallbackContent.footer?.tagline,
    },
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
  };
}

export default function Site() {
  const { slug } = useParams<{ slug: string }>();
  const { data: website, isLoading } = useWebsiteBySlug(slug);

  const content = useMemo(
    () => normalizeContent(website?.json_data),
    [website?.json_data],
  );

  if (!slug) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-2xl font-display">Site not found</p>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  const heroBg = website.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=900&fit=crop";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />

      <header
        className="relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${content.metadata?.primaryColor ?? "rgba(255,255,255,0.08)"}, ${content.metadata?.secondaryColor ?? "rgba(0,0,0,0.4)"})`,
        }}
      >
        <div className="absolute inset-0 opacity-50">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        </div>

        <div className="relative container px-6 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl space-y-6"
          >
            <p className="uppercase tracking-[0.2em] text-sm text-primary">
              {website.title || "Live Site"}
            </p>
            <h1 className="font-display text-4xl md:text-6xl">
              {content.hero.headline}
            </h1>
            {content.hero.subheadline && (
              <p className="text-lg md:text-xl text-muted-foreground">
                {content.hero.subheadline}
              </p>
            )}

            <div className="flex flex-wrap gap-4 pt-4">
              {content.hero.ctaPrimary && (
                <Button variant="hero">
                  {content.hero.ctaPrimary}
                </Button>
              )}
              {content.hero.ctaSecondary && (
                <Button variant="hero-outline">
                  {content.hero.ctaSecondary}
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container px-6 py-16 space-y-20">
        {content.about?.title && (
          <section className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl mb-4">{content.about.title}</h2>
              {content.about.description && (
                <p className="text-muted-foreground leading-relaxed">{content.about.description}</p>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden border border-border/40 exhibit-card h-full min-h-[260px] bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
          </section>
        )}

        {content.features && content.features.length > 0 && (
          <section>
            <h3 className="font-display text-2xl mb-6">Highlights</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {content.features.map((feature, idx) => (
                <div key={`${feature.title}-${idx}`} className="glass-panel rounded-xl p-5 border border-border/40 space-y-2">
                  <h4 className="font-semibold">{feature.title}</h4>
                  {feature.description && (
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {content.testimonials && content.testimonials.length > 0 && (
          <section>
            <h3 className="font-display text-2xl mb-6">What people say</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {content.testimonials.map((t, idx) => (
                <div key={`${t.quote}-${idx}`} className="glass-panel rounded-xl p-6 border border-border/40 space-y-3">
                  <p className="text-lg leading-relaxed">“{t.quote}”</p>
                  <p className="text-sm text-muted-foreground">
                    {t.author} {t.role ? `· ${t.role}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {content.cta?.headline && (
          <section className="text-center space-y-4 glass-panel rounded-2xl p-10 border border-border/40">
            <h3 className="font-display text-3xl">{content.cta.headline}</h3>
            {content.cta.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">{content.cta.description}</p>
            )}
            {content.cta.buttonText && (
              <Button variant="hero" onClick={() => (window.location.href = "/")}>
                {content.cta.buttonText}
              </Button>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-border/40 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {content.footer?.tagline ?? "Exhibit"}
        </p>
      </footer>
    </div>
  );
}
