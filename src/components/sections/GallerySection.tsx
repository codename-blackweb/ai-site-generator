import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, ExternalLink, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useAuth } from "@/contexts/AuthContext";
import { ProjectDetailModal } from "@/components/ProjectDetailModal";

const placeholderImages = [
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop",
];

const mockProjects = [
  {
    id: "mock-1",
    title: "Meridian Studio",
    description: "A creative agency landing page with bold typography and smooth animations",
    industry: "Creative Agency",
    created_at: "2024-12-01",
    preview_image_url: placeholderImages[0],
  },
  {
    id: "mock-2",
    title: "Fintech Pro",
    description: "Modern financial services platform with trust-building design",
    industry: "Finance",
    created_at: "2024-12-05",
    preview_image_url: placeholderImages[1],
  },
  {
    id: "mock-3",
    title: "Verde Health",
    description: "Clean healthcare provider website focused on patient care",
    industry: "Healthcare",
    created_at: "2024-11-20",
    preview_image_url: placeholderImages[2],
  },
];

export function GallerySection() {
  const { user } = useAuth();
  const { data: userProjects, isLoading } = useProjects();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Combine user projects with mock projects for display
  const displayProjects = user && userProjects?.length 
    ? userProjects.map((p, i) => ({
        ...p,
        preview_image_url: p.preview_image_url || placeholderImages[i % placeholderImages.length],
      }))
    : mockProjects;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.42,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <section id="gallery" className="py-32 relative">
      <div className="container px-6">
        {/* Section header */}
        <motion.div 
          className="max-w-3xl mb-20"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.42, ease: "easeOut" }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6">
            Featured Samples
          </h2>
          <p className="text-muted-foreground text-lg">
            {user 
              ? "Your curated collection of websites. Each piece is a fully functional, production-ready creation."
              : "A curated collection of sample websites. Sign in to create and save your own."}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[280px]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {displayProjects.map((project, index) => {
              const isLarge = index === 0 || index === 3;
              const gridClass = isLarge 
                ? index === 0 
                  ? "md:col-span-8 md:row-span-2" 
                  : "md:col-span-7 md:row-span-2"
                : "md:col-span-4";

              return (
                <motion.article
                  key={project.id}
                  variants={itemVariants}
                  className={`group relative rounded-2xl overflow-hidden exhibit-card cursor-pointer ${gridClass}`}
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => 'generated_content' in project && setSelectedProject(project as Project)}
                  whileHover={{ y: -4, transition: { duration: 0.24, ease: "easeOut" } }}
                >
                  {/* Background image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                    style={{ backgroundImage: `url(${project.preview_image_url})` }}
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-slow" />
                  
                  {/* Category badge */}
                  <div className="absolute top-4 left-4 glass-panel rounded-full px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-medium">
                    <span className="text-xs text-foreground/80">{project.industry || 'Website'}</span>
                  </div>

                  {/* Content */}
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-slow ease-exhibit">
                      <h3 className="font-display text-xl md:text-2xl lg:text-3xl mb-2">
                        {project.title}
                      </h3>
                      <p className={`text-muted-foreground text-sm md:text-base line-clamp-2 ${
                        hoveredId === project.id ? 'opacity-100' : 'opacity-0'
                      } transition-opacity duration-medium`}>
                        {project.description}
                      </p>
                      
                      {/* Actions - visible on hover */}
                      <div className={`flex items-center gap-3 mt-4 ${
                        hoveredId === project.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                      } transition-all duration-medium`}>
                        <Button variant="coral" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button variant="glass" size="sm">
                          <ExternalLink className="w-4 h-4" />
                          Open
                        </Button>
                        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(project.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {/* View all link */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.42, delay: 0.2, ease: "easeOut" }}
        >
          <a href="#generator">
            <Button variant="outline" size="lg" className="group">
              Create Your Own
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </a>
        </motion.div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </section>
  );
}
