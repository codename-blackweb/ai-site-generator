import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useClientPortfolio, usePortfolioProjects } from "@/hooks/useClientPortfolios";
import exhibitLogo from "@/assets/exhibit-logo.png";
import { ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Portfolio() {
  const { slug } = useParams<{ slug: string }>();
  const { data: portfolio, isLoading: portfolioLoading } = useClientPortfolio(slug || "");
  const { data: portfolioProjects, isLoading: projectsLoading } = usePortfolioProjects(portfolio?.id || "");

  if (portfolioLoading || projectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="font-display text-3xl mb-4">Portfolio not found</h1>
        <p className="text-muted-foreground">This portfolio doesn't exist or is private.</p>
      </div>
    );
  }

  const accentStyle = portfolio.accent_color 
    ? { "--accent-override": portfolio.accent_color } as React.CSSProperties
    : {};

  return (
    <div className="min-h-screen bg-background pt-12 md:pt-16" style={accentStyle}>
      <div className="noise-overlay" />
      
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="container px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={exhibitLogo} alt="EXHIBIT" className="h-6 w-auto opacity-50" />
            {portfolio.client_logo_url && (
              <>
                <span className="text-muted-foreground">/</span>
                <img 
                  src={portfolio.client_logo_url} 
                  alt={portfolio.client_name || ""} 
                  className="h-8 w-auto"
                />
              </>
            )}
          </div>
          
          {portfolio.client_name && (
            <span className="text-sm text-muted-foreground">
              Prepared for {portfolio.client_name}
            </span>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl mb-6">
              {portfolio.title}
            </h1>
            {portfolio.introduction && (
              <p className="text-xl text-muted-foreground leading-relaxed">
                {portfolio.introduction}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="pb-32">
        <div className="container px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {portfolioProjects?.map((item: any, index: number) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] exhibit-card cursor-pointer"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-slow ease-exhibit group-hover:scale-105"
                  style={{ 
                    backgroundImage: `url(${item.project?.preview_image_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop'})` 
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <h3 className="font-display text-2xl mb-2">
                    {item.project?.title}
                  </h3>
                  <p className="text-muted-foreground line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.project?.description}
                  </p>
                  
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="coral" size="sm">
                      View Project
                    </Button>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.project?.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </span>
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
            <img src={exhibitLogo} alt="EXHIBIT" className="h-4 w-auto" />
          </div>
          
          <Button variant="ghost" size="sm" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Share
          </Button>
        </div>
      </footer>
    </div>
  );
}
