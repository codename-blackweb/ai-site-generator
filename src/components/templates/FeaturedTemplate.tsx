import { Link } from "react-router-dom";
import type { Template } from "@/lib/template.types";
import { Button } from "@/components/ui/button";

export function FeaturedTemplate({ template }: { template: Template }) {
  return (
    <div className="group rounded-3xl border border-border/60 bg-background/70 overflow-hidden hover:bg-background/80 transition flex flex-col">
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={template.featureImage.src}
          alt={template.featureImage.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="eager"
        />
        <div className="absolute top-3 right-3 text-xs rounded-full bg-background/80 px-3 py-1 border border-border/60">
          Featured · {template.category}
        </div>
      </div>

      <div className="p-6 md:p-8 flex-1 flex flex-col">
        <div className="text-xs text-muted-foreground">{template.tags.join(" · ")}</div>
        <h2 className="mt-3 text-2xl font-semibold leading-tight">{template.name}</h2>
        <p className="mt-3 text-muted-foreground">{template.excerpt}</p>

        <div className="mt-6 flex flex-wrap gap-3">
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
