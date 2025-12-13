import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CareersPage() {
  const notify = () => toast.success("Saved. (Wire to real form later.)");

  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Careers</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            This page is intentionally honest. No fake listings. No vapor roles.
          </p>

          <div className="mt-10 grid gap-6">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Who fits here</h2>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li>• You ship. You don’t romanticize architecture.</li>
                <li>• You prefer truth over “looks good in a demo.”</li>
                <li>• You build for reliability: fallbacks, validation, deterministic flows.</li>
              </ul>
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Get notified</h2>
              <p className="text-muted-foreground mt-2">
                Wire this to a real email capture later. For now it proves the page is not empty.
              </p>
              <div className="mt-5">
                <Button variant="coral" onClick={notify}>
                  Notify me about roles
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CareersPage;
