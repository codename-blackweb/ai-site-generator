import { useState } from "react";
import { ExternalLink, Eye, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  featured: boolean;
  image: string;
}

const mockProjects: Project[] = [
  {
    id: "1",
    title: "Meridian Studio",
    description: "A creative agency landing page with bold typography and smooth animations",
    category: "Creative Agency",
    date: "Dec 2024",
    featured: true,
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop",
  },
  {
    id: "2",
    title: "Fintech Pro",
    description: "Modern financial services platform with trust-building design",
    category: "Finance",
    date: "Dec 2024",
    featured: false,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
  },
  {
    id: "3",
    title: "Verde Health",
    description: "Clean healthcare provider website focused on patient care",
    category: "Healthcare",
    date: "Nov 2024",
    featured: false,
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=600&fit=crop",
  },
  {
    id: "4",
    title: "Artisan Coffee",
    description: "E-commerce experience for specialty coffee roasters",
    category: "E-commerce",
    date: "Nov 2024",
    featured: true,
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop",
  },
  {
    id: "5",
    title: "Novum Architects",
    description: "Portfolio showcase for contemporary architecture firm",
    category: "Real Estate",
    date: "Oct 2024",
    featured: false,
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop",
  },
];

export function GallerySection() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section id="gallery" className="py-32 relative">
      <div className="container px-6">
        {/* Section header */}
        <div className="max-w-3xl mb-20">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6">
            The Exhibition
          </h2>
          <p className="text-muted-foreground text-lg">
            A curated collection of AI-generated websites. Each piece is a fully functional, 
            production-ready creation — ready to inspire or customize for your own vision.
          </p>
        </div>

        {/* Asymmetric gallery grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[280px]">
          {mockProjects.map((project, index) => {
            const isLarge = project.featured;
            const gridClass = isLarge 
              ? index === 0 
                ? "md:col-span-8 md:row-span-2" 
                : "md:col-span-7 md:row-span-2"
              : "md:col-span-4";

            return (
              <article
                key={project.id}
                className={`group relative rounded-2xl overflow-hidden exhibit-card cursor-pointer ${gridClass}`}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Background image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-slow ease-exhibit group-hover:scale-105"
                  style={{ backgroundImage: `url(${project.image})` }}
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-slow" />
                
                {/* Category badge */}
                <div className="absolute top-4 left-4 glass-panel rounded-full px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-medium">
                  <span className="text-xs text-foreground/80">{project.category}</span>
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
                        {project.date}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* View all link */}
        <div className="text-center mt-16">
          <Button variant="outline" size="lg" className="group">
            View Full Collection
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}
