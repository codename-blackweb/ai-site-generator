import { Link } from "react-router-dom";
import type { Template } from "@/lib/template.types";
import { Button } from "@/components/ui/button";

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-background/60 overflow-hidden hover:bg-background/80 transition flex flex-col">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={template.featureImage.src}
          alt={template.featureImage.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute top-3 right-3 text-xs rounded-full bg-background/80 px-2 py-1 border border-border/60">
          {template.category}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold leading-snug">{template.name}</h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{template.excerpt}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {template.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[11px] rounded-full border border-border/70 bg-background/50 px-2 py-1 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Link to={`/templates/${template.slug}`} className="flex-1">
            <Button variant="coral" className="w-full">
              Preview
            </Button>
          </Link>
          <Link to={`/generator?template=${template.slug}`} className="flex-1">
            <Button variant="glass" className="w-full">
              Use Template
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
