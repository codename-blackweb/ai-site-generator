import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, LayoutGrid, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function SectionCard(props: {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  cta: string;
}) {
  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-secondary/40 flex items-center justify-center">
          {props.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-display">{props.title}</h3>
          <p className="text-muted-foreground mt-2 leading-relaxed">{props.description}</p>
          <div className="mt-5">
            <Link to={props.to}>
              <Button variant="coral" className="gap-2">
                {props.cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformPage() {
  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="py-16 md:py-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="glass-panel rounded-3xl p-8 md:p-12 border border-border/50 mesh-gradient">
            <h1 className="font-display text-4xl md:text-5xl leading-tight">
              Platform
            </h1>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed max-w-2xl">
              This is the control room. Generate sites, manage outputs, publish clean public pages,
              and keep the pipeline stable as you move from prototype to production.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-background/30 border border-border/40 p-5">
                <div className="text-sm text-muted-foreground">Core flow</div>
                <div className="mt-2 font-medium">Generator → Websites → Gallery → Public Site</div>
              </div>
              <div className="rounded-2xl bg-background/30 border border-border/40 p-5">
                <div className="text-sm text-muted-foreground">Operational goal</div>
                <div className="mt-2 font-medium">Stable generation, saved output, safe rendering</div>
              </div>
              <div className="rounded-2xl bg-background/30 border border-border/40 p-5">
                <div className="text-sm text-muted-foreground">Failure policy</div>
                <div className="mt-2 font-medium">Never blank screens. Always fallbacks.</div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <SectionCard
              icon={<Sparkles className="h-6 w-6 text-primary" />}
              title="Generator"
              description="Create a new site in minutes. Save immediately. Thumbnail generation runs in the background."
              to="/generator"
              cta="Open Generator"
            />
            <SectionCard
              icon={<LayoutGrid className="h-6 w-6 text-primary" />}
              title="Gallery"
              description="Browse output. Confirm quality. Click through to the public site route."
              to="/gallery"
              cta="Open Gallery"
            />
            <SectionCard
              icon={<ShieldCheck className="h-6 w-6 text-primary" />}
              title="Documentation"
              description="Schema assumptions, runtime behavior, access rules, and the API surface."
              to="/docs"
              cta="Open Docs"
            />
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h3 className="text-xl font-display">Operational checklist</h3>
              <ul className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
                <li>• Generator returns validated JSON and never crashes UI.</li>
                <li>• Websites table saves: title, slug, json_data, is_public, thumbnail_url.</li>
                <li>• Public route /site/:slug renders with schema guard + fallback.</li>
                <li>• Gallery never shows broken images (fallback gradient).</li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/api">
                  <Button variant="glass" className="gap-2">
                    API Surface <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/support">
                  <Button variant="glass" className="gap-2">
                    Support <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PlatformPage;
