import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getWebsiteBySlug, getUserWebsites } from "@/hooks/useWebsites";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import exhibitLogo from "@/assets/exhibit-logo.png";
import { ExternalLink, Calendar } from "lucide-react";

export default function Portfolio() {
  const { slug } = useParams<{ slug: string }>();

  const [website, setWebsite] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        if (!slug) return;

        const target = await getWebsiteBySlug(slug);
        setWebsite(target);

        if (target?.user_id) {
          const others = await getUserWebsites(target.user_id);
          setRelated(others.filter((w) => w.slug !== slug));
        }
      } catch (e) {
        console.error("Portfolio load error:", e);
      }

      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!website) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="font-display text-3xl mb-4">Website not found</h1>
        <p className="text-muted-foreground">
          This website is private or does not exist.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="noise-overlay" />

      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={exhibitLogo} className="h-6 opacity-50" />
            <span className="text-sm text-muted-foreground">/ {website.slug}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              window.open(`/site/${website.slug}`, "_blank")
            }
          >
            <ExternalLink className="w-4 h-4" />
            View Live
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container px-6">
          <motion.div
            className="max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-display text-6xl mb-6">
              {website.title}
            </h1>

            <p className="text-xl text-muted-foreground mb-4">
              Created {new Date(website.created_at).toLocaleDateString()}
            </p>

            {website.thumbnail_url && (
              <div
                className="rounded-xl overflow-hidden exhibit-card mt-8 aspect-[16/9] bg-cover bg-center"
                style={{ backgroundImage: `url(${website.thumbnail_url})` }}
              />
            )}
          </motion.div>
        </div>
      </section>

      {/* Related Websites */}
      <section className="pb-32">
        <div className="container px-6">
          <h2 className="font-display text-3xl mb-8">More from this creator</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {related.map((item: any, index: number) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.1 }}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] exhibit-card cursor-pointer"
                onClick={() => {
                  window.location.href = `/portfolio/${item.slug}`;
                }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${item.thumbnail_url || exhibitLogo})`,
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-8">
                  <h3 className="font-display text-2xl mb-2">{item.title}</h3>

                  <div className="flex items-center gap-3 opacity-90 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Curated with</span>
            <img src={exhibitLogo} className="h-4 opacity-60" />
          </div>

          <Button variant="ghost" size="sm">
            <ExternalLink className="w-4 h-4" />
            Share
          </Button>
        </div>
      </footer>
    </div>
  );
}
