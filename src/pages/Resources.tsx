import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Resource = {
  title: string;
  description: string;
  href: string;
  category: "Getting Started" | "Publishing" | "Data" | "Reliability";
};

const RESOURCES: Resource[] = [
  {
    title: "Generation lifecycle",
    description: "What gets generated, what gets saved, and what gets validated.",
    href: "/docs",
    category: "Getting Started",
  },
  {
    title: "Public route behavior",
    description: "How /site/:slug safely renders even with incomplete JSON.",
    href: "/docs",
    category: "Publishing",
  },
  {
    title: "Supabase functions overview",
    description: "How edge functions are invoked and how secrets are managed.",
    href: "/docs",
    category: "Data",
  },
  {
    title: "Avoiding white screens",
    description: "CSS import order, missing exports, runtime errors — and how to diagnose quickly.",
    href: "/support",
    category: "Reliability",
  },
];

export function ResourcesPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return RESOURCES;
    return RESOURCES.filter((r) =>
      [r.title, r.description, r.category].some((x) => x.toLowerCase().includes(s))
    );
  }, [q]);

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Resources</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            Practical references that reduce build friction and keep output quality consistent.
          </p>

          <div className="mt-8 glass-panel rounded-3xl p-4 md:p-5 border border-border/50 flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search resources…"
              className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {filtered.map((r) => (
              <a
                key={r.title}
                href={r.href}
                className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50 hover:shadow-lg transition-shadow"
              >
                <div className="text-xs text-muted-foreground">{r.category}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl">{r.title}</h2>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-3 leading-relaxed">{r.description}</p>
              </a>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-10 glass-panel rounded-3xl p-8 border border-border/50">
              <div className="font-medium">No matches.</div>
              <div className="text-muted-foreground mt-1">
                Try fewer keywords or browse the docs directly.
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ResourcesPage;
