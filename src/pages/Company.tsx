export function CompanyPage() {
  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="py-16 md:py-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Company</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            This page exists for legitimacy and clarity, not fluff. Keep it short and true.
          </p>

          <div className="mt-10 grid gap-6">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">What we build</h2>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li>• A generation pipeline that produces a publishable site artifact.</li>
                <li>• A stable public rendering layer with schema validation + fallbacks.</li>
                <li>• An operational UX: clear states, non-blocking async steps, no blank pages.</li>
              </ul>
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">What we don’t do</h2>
              <ul className="mt-4 space-y-2 text-muted-foreground">
                <li>• We don’t ship “demo pages” that go nowhere.</li>
                <li>• We don’t bury runtime failures under “coming soon.”</li>
                <li>• We don’t rely on vibes instead of validation.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CompanyPage;
