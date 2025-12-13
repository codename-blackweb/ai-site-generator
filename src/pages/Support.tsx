import { useMemo, useState } from "react";
import { AlertTriangle, Search, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Item = { q: string; a: string; tags: string[] };

const FAQ: Item[] = [
  {
    q: "Why do I get a white screen?",
    a: "Usually: CSS build error (PostCSS stops app), missing named exports, or an unhandled runtime exception. Check Vite console first, then browser console.",
    tags: ["runtime", "build", "vite"],
  },
  {
    q: "Why are my thumbnails missing?",
    a: "Thumbnail generation is non-blocking by design. The site can be created successfully without a thumbnail. Gallery should always show a fallback gradient.",
    tags: ["thumbnails", "gallery"],
  },
  {
    q: "Why do Deno edge function files show TypeScript errors?",
    a: "VS Code TypeScript doesn’t fully typecheck Deno remote imports. Supabase deploy/runtime is the source of truth.",
    tags: ["supabase", "deno"],
  },
];

export function SupportPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return FAQ;
    return FAQ.filter((x) => [x.q, x.a, ...x.tags].some((v) => v.toLowerCase().includes(s)));
  }, [q]);

  const copyDebugChecklist = async () => {
    const text = `Debug checklist:
1) Vite terminal output (build blockers)
2) Browser console (missing exports / runtime exceptions)
3) Network tab (failed function invocations)
4) Supabase logs (edge function errors)
5) Data layer: websites row exists, slug is correct, is_public true`;
    await navigator.clipboard.writeText(text);
    toast.success("Debug checklist copied.");
  };

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="font-display text-4xl md:text-5xl">Support</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                Fast answers. Practical fixes. No theatre.
              </p>
            </div>
            <Button variant="glass" className="gap-2" onClick={copyDebugChecklist}>
              <Copy className="h-4 w-4" />
              Copy Debug Checklist
            </Button>
          </div>

          <div className="mt-8 glass-panel rounded-3xl p-4 md:p-5 border border-border/50 flex items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search support…"
              className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="mt-10 space-y-4">
            {filtered.map((x) => (
              <div key={x.q} className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <div className="font-medium">{x.q}</div>
                    <div className="text-muted-foreground mt-2 leading-relaxed">{x.a}</div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Tags: {x.tags.join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-10 glass-panel rounded-3xl p-8 border border-border/50">
              <div className="font-medium">No matches.</div>
              <div className="text-muted-foreground mt-1">
                Try fewer keywords. If it’s truly weird, check Supabase function logs.
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default SupportPage;
