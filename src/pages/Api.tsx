import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function CodeBlock({ label, code }: { label: string; code: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    toast.success("Copied.");
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-background/30 p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-muted-foreground">{label}</div>
        <Button variant="glass" size="sm" onClick={copy} className="gap-2">
          <Copy className="h-4 w-4" />
          Copy
        </Button>
      </div>
      <pre className="mt-4 overflow-auto text-sm text-muted-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ApiPage() {
  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-5xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">API</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            A clean, practical API surface. No ambiguity about what’s supported.
          </p>

          <div className="mt-10 grid gap-6">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Edge Functions</h2>
              <p className="text-muted-foreground mt-2">
                These are invoked client-side via supabase-js.
              </p>
            </div>

            <CodeBlock
              label="Generate website (client invocation)"
              code={`const { data, error } = await supabase.functions.invoke("generate-website", {
  body: {
    projectName: "Acme Studio",
    goal: "Convert visitors into booked consult calls",
    audience: "Founders",
    tone: "Confident, direct",
  }
});`}
            />

            <CodeBlock
              label="Generate thumbnail (client invocation)"
              code={`const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
  body: {
    websiteId: "<uuid>",
    slug: "acme-studio",
  }
});`}
            />

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Auth expectations</h2>
              <ul className="mt-4 space-y-2 text-muted-foreground leading-relaxed">
                <li>• Public site pages read <code>websites</code> where <code>is_public = true</code>.</li>
                <li>• Owner-only pages query by <code>user_id</code>.</li>
                <li>• Service role keys must never ship to the browser.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ApiPage;
