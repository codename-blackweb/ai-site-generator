import { Wand2, FolderOpen, Image, Users, Link, Palette } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI Generation",
    description: "Create complete websites in seconds with intelligent AI that understands your brand and audience.",
  },
  {
    icon: FolderOpen,
    title: "Project Library",
    description: "Every creation is automatically saved, organized, and ready for editing or duplication.",
  },
  {
    icon: Image,
    title: "Portfolio Gallery",
    description: "Showcase your work in a curated, museum-grade gallery that commands attention.",
  },
  {
    icon: Users,
    title: "Client Views",
    description: "Create tailored portfolio presentations for each client with custom branding and selections.",
  },
  {
    icon: Link,
    title: "Instant Sharing",
    description: "Generate shareable links for any project or portfolio with privacy controls.",
  },
  {
    icon: Palette,
    title: "Theme System",
    description: "Switch between exhibition themes to match your aesthetic or client preferences.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Subtle background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative container px-6">
        <div className="text-center mb-20">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6">
            Built for creators
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every feature designed to help you create, curate, and share your best work 
            with the professionalism it deserves.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group glass-panel rounded-2xl p-8 hover:bg-secondary/40 transition-all duration-slow opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors duration-medium">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
