import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CopyBlock({ title, value }: { title: string; value: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard.");
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-background/30 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
        <Button variant="glass" size="sm" onClick={copy} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <pre className="mt-4 overflow-auto text-sm text-muted-foreground">
        <code>{value}</code>
      </pre>
    </div>
  );
}

export function DocumentationPage() {
  const [tab, setTab] = useState<"overview" | "schema" | "runtime">("overview");

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Documentation</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            This is the canonical behavior contract: generation → persistence → public rendering.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button variant={tab === "overview" ? "coral" : "glass"} onClick={() => setTab("overview")}>
              Overview
            </Button>
            <Button variant={tab === "schema" ? "coral" : "glass"} onClick={() => setTab("schema")}>
              Schema
            </Button>
            <Button variant={tab === "runtime" ? "coral" : "glass"} onClick={() => setTab("runtime")}>
              Runtime & Safety
            </Button>
          </div>

          <div className="mt-10 grid gap-6">
            {tab === "overview" && (
              <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
                <h2 className="font-display text-2xl">Lifecycle</h2>
                <ol className="mt-4 space-y-3 text-muted-foreground leading-relaxed">
                  <li>1) Generator invokes edge function <code>generate-website</code>.</li>
                  <li>2) UI saves <code>json_data</code> to <code>websites</code> with a unique slug.</li>
                  <li>3) Thumbnail generation runs async; failure never blocks success.</li>
                  <li>4) Public route <code>/site/:slug</code> renders with schema guard + fallbacks.</li>
                </ol>
              </div>
            )}

            {tab === "schema" && (
              <>
                <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
                  <h2 className="font-display text-2xl">Websites table expectations</h2>
                  <p className="text-muted-foreground mt-2 leading-relaxed">
                    Minimal required fields to ship the product loop without breaking:
                  </p>
                  <ul className="mt-4 space-y-2 text-muted-foreground">
                    <li>• <code>user_id</code> (owner)</li>
                    <li>• <code>title</code></li>
                    <li>• <code>slug</code> (public path key)</li>
                    <li>• <code>json_data</code> (generated site structure)</li>
                    <li>• <code>is_public</code></li>
                    <li>• <code>thumbnail_url</code> (optional but expected)</li>
                  </ul>
                </div>
              </>
            )}

            {tab === "runtime" && (
              <>
                <CopyBlock
                  title="Operational rule: never blank-screen"
                  value={`- UI must catch and render errors (no unhandled throws in render)
- Public site rendering must validate JSON schema and fallback on missing blocks
- Thumbnail must be optional and never block publish`}
                />
                <CopyBlock
                  title="Debug checklist"
                  value={`1) Check console for missing named exports (common cause of white screen)
2) Fix CSS build errors (PostCSS stops app)
3) Confirm routes resolve to real components
4) Verify Supabase function returns the expected JSON shape`}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default DocumentationPage;
