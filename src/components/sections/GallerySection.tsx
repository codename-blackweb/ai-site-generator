import { motion } from "framer-motion";
import { useClientPortfolios } from "@/hooks/useClientPortfolios";
import { Skeleton } from "@/components/ui/skeleton";
import { TEMPLATES } from "@/data/templates";

export default function GallerySection() {
  const { portfolios, isLoading } = useClientPortfolios();

  const hasWebsites = !isLoading && portfolios.length > 0;
  const galleryItems = hasWebsites
    ? portfolios.map((site) => ({
        id: site.id,
        title: site.title || "Generated website",
        image: site.thumbnail_url,
        href: site.slug ? `/site/${site.slug}` : undefined,
        subtitle: "Generated website",
      }))
    : TEMPLATES.map((tpl) => ({
        id: tpl.id,
        title: tpl.name,
        image: tpl.featureImage?.src,
        href: `/templates/${tpl.slug}`,
        subtitle: tpl.category || "Theme",
      }));

  return (
    <section id="gallery" className="py-32 scroll-mt-28">
      <div className="container px-6 max-w-6xl mx-auto">
        <div className="mb-12 text-center space-y-3">
          <h2 className="font-display text-4xl">
            {hasWebsites ? "Generated Websites" : "Curated Themes Gallery"}
          </h2>
          <p className="text-muted-foreground">
            {hasWebsites
              ? "Latest public sites generated on EXHIBIT."
              : "Preview our theme library while sites load."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}

          {!isLoading &&
            galleryItems.map((item) => (
              <motion.article
                key={item.id}
                className="glass-panel rounded-xl overflow-hidden"
                whileHover={{ y: -4 }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title ?? "Website thumbnail"}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Generating thumbnail…
                  </div>
                )}

                <div className="p-4">
                  <h3 className="font-medium text-lg">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </motion.article>
            ))}
        </div>
      </div>
    </section>
  );
}
