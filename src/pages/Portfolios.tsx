import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type LocalPortfolio = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
};

const STORAGE_KEY = "lumen_local_portfolios_v1";

function loadPortfolios(): LocalPortfolio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function savePortfolios(items: LocalPortfolio[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function PortfoliosPage() {
  const [items, setItems] = useState<LocalPortfolio[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setItems(loadPortfolios());
  }, []);

  const canCreate = useMemo(() => name.trim().length >= 2, [name]);

  const create = () => {
    if (!canCreate) return;

    const next: LocalPortfolio = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [next, ...items];
    setItems(updated);
    savePortfolios(updated);

    setName("");
    setDescription("");
    toast.success("Portfolio created.");
  };

  const remove = (id: string) => {
    const updated = items.filter((p) => p.id !== id);
    setItems(updated);
    savePortfolios(updated);
    toast.success("Portfolio removed.");
  };

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="py-16 md:py-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <h1 className="font-display text-4xl md:text-5xl">Portfolios</h1>
              <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
                Group related sites together (clients, campaigns, collections). This page is fully functional
                even before you introduce a portfolios table — it uses local storage as a stable baseline.
              </p>
            </div>
            <Link to="/gallery">
              <Button variant="glass" className="gap-2">
                Browse Gallery <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Create a portfolio</h2>
              <p className="text-muted-foreground mt-2">
                Minimum viable organization that doesn’t block you later.
              </p>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Royal Caribbean Dashboards"
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Description</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional: what belongs in this portfolio?"
                    className="bg-secondary/50"
                  />
                </div>

                <Button
                  variant="coral"
                  className="w-full gap-2"
                  onClick={create}
                  disabled={!canCreate}
                >
                  <Plus className="h-4 w-4" />
                  Create Portfolio
                </Button>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Your portfolios</h2>
              <p className="text-muted-foreground mt-2">
                Stored locally for now; safe to replace with Supabase later.
              </p>

              <div className="mt-6 space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-border/50 bg-background/30 p-5">
                    <div className="font-medium">No portfolios yet.</div>
                    <div className="text-muted-foreground mt-1">
                      Create one on the left — this page won’t stay empty.
                    </div>
                  </div>
                ) : (
                  items.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-border/50 bg-background/30 p-5 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="font-medium">{p.name}</div>
                        {p.description && (
                          <div className="text-muted-foreground mt-1">{p.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                          Created {new Date(p.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        variant="glass"
                        size="sm"
                        className="gap-2"
                        onClick={() => remove(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
            <h3 className="font-display text-2xl">Next step (when you’re ready)</h3>
            <p className="text-muted-foreground mt-2 leading-relaxed">
              When you add a Supabase portfolios table later, keep the UX identical and swap the storage layer.
              That’s how you ship without waiting on schema perfection.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PortfoliosPage;
