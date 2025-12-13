import { useMemo, useState } from "react";
import { Paintbrush, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Theme = {
  id: string;
  name: string;
  description: string;
  palette: { label: string; value: string }[];
};

const THEMES: Theme[] = [
  {
    id: "night",
    name: "Night (Default)",
    description: "Deep background, warm foreground, confident contrast.",
    palette: [
      { label: "Background", value: "hsl(222 47% 6%)" },
      { label: "Primary", value: "hsl(12 72% 62%)" },
      { label: "Accent", value: "hsl(195 45% 25%)" },
    ],
  },
  {
    id: "day",
    name: "Day",
    description: "Bright background, crisp text, soft accents.",
    palette: [
      { label: "Background", value: "hsl(40 20% 96%)" },
      { label: "Primary", value: "hsl(12 72% 55%)" },
      { label: "Accent", value: "hsl(195 35% 75%)" },
    ],
  },
];

export function ThemesPage() {
  const [active, setActive] = useState<string>(() => localStorage.getItem("lumen_theme") || "night");

  const current = useMemo(() => THEMES.find((t) => t.id === active) || THEMES[0], [active]);

  const apply = (id: string) => {
    setActive(id);
    localStorage.setItem("lumen_theme", id);
    toast.success(`Theme set to “${THEMES.find((t) => t.id === id)?.name ?? id}”.`);
  };

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="font-display text-4xl md:text-5xl">Themes</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                Select a theme that controls the visual system. This page is complete today and becomes
                “real” later by mapping theme selection to your existing theme provider.
              </p>
            </div>
            <div className="glass-panel rounded-2xl px-4 py-3 border border-border/50 flex items-center gap-2">
              <Paintbrush className="h-4 w-4 text-primary" />
              <div className="text-sm text-muted-foreground">
                Active: <span className="text-foreground font-medium">{current.name}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {THEMES.map((t) => (
              <div key={t.id} className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl">{t.name}</h2>
                    <p className="text-muted-foreground mt-2">{t.description}</p>
                  </div>
                  {t.id === active && (
                    <div className="h-10 w-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {t.palette.map((p) => (
                    <div key={p.label} className="rounded-2xl border border-border/50 bg-background/30 p-4">
                      <div className="text-xs text-muted-foreground">{p.label}</div>
                      <div className="mt-3 h-8 w-full rounded-xl" style={{ background: p.value }} />
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Button
                    variant={t.id === active ? "glass" : "coral"}
                    className="w-full"
                    onClick={() => apply(t.id)}
                  >
                    {t.id === active ? "Applied" : "Apply Theme"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default ThemesPage;
