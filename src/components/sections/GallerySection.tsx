import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getUserWebsites } from "@/hooks/useWebsites";
import { easeOut } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const placeholderImages = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
];

export function GallerySection() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getUserWebsites(user.id);
        setWebsites(
          data.map((w, i) => ({
            ...w,
            preview_image_url: w.thumbnail_url || placeholderImages[i % placeholderImages.length],
          }))
        );
      } catch (e) {
        console.error("Failed loading websites:", e);
      }
      setLoading(false);
    }
    load();
  }, [user]);

  const displayItems = user && websites.length > 0
    ? websites
    : [
        {
          id: "sample-1",
          title: "Sample Portfolio",
          description: "A placeholder sample project.",
          created_at: new Date().toISOString(),
          preview_image_url: placeholderImages[0],
          is_public: true,
        },
      ];

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.42, ease: easeOut },
    },
  };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

  return (
    <section id="gallery" className="py-32 relative">
      <div className="container px-6">
        <motion.div
          className="max-w-3xl mb-20"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.42, ease: "easeOut" }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6">
            Featured Websites
          </h2>
          <p className="text-muted-foreground text-lg">
            {user
              ? "Your curated library of generated websites."
              : "Sign in to generate and save your own website creations."}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[280px]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {displayItems.map((item, index) => {
              const isLarge = index % 3 === 0;
              const gridClass = isLarge
                ? "md:col-span-8 md:row-span-2"
                : "md:col-span-4";
              const previewImage = item.preview_image_url || item.thumbnail_url || placeholderImages[index % placeholderImages.length];
              const createdLabel = item.created_at
                ? getRelativeTime(new Date(item.created_at))
                : "Generated recently";

              return (
                <motion.article
                  key={item.id}
                  variants={itemVariants}
                  className={`group relative rounded-2xl overflow-hidden exhibit-card cursor-pointer ${gridClass}`}
                  whileHover={{
                    y: -4,
                    transition: { duration: 0.24, ease: easeOut },
                  }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    style={{
                      backgroundImage: previewImage ? `url(${previewImage})` : undefined,
                      backgroundColor: "rgba(255,255,255,0.02)",
                    }}
                  />
                  {!previewImage && (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-exhibit-teal/10 to-background animate-pulse" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <h3 className="font-display text-xl md:text-2xl lg:text-3xl mb-2">
                      {item.title}
                    </h3>

                    <p className="text-muted-foreground text-sm md:text-base line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {item.description || "Generated website"}
                    </p>

                    <div className="flex items-center gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Badge variant="secondary" className="bg-background/70 border border-border/50">
                        {item.is_public ? "Published" : "Draft"}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {createdLabel}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        <Button variant="coral" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="glass" size="sm">
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        <motion.div
          className="text-center mt-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.2, ease: "easeOut" }}
        >
          <a href="#generator">
            <Button variant="outline" size="lg" className="group">
              Create a Website
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function getRelativeTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "Generated just now";
  if (minutes < 60) return `Generated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Generated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `Generated ${days} day${days === 1 ? "" : "s"} ago`;
}
