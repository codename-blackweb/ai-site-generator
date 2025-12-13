export function AboutPage() {
  return (
    <main className="min-h-[calc(100vh-80px)]">
      <section className="pt-24 md:pt-28 pb-16 md:pb-20">
        <div className="container px-6 max-w-4xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">About</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            The goal is simple: take a prototype generator and make it operational — predictable,
            safe, and actually usable by real humans.
          </p>

          <div className="mt-10 grid gap-6">
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Design principle</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                Every page must ship with an outcome. If a page doesn’t do anything yet,
                it still needs to be informative and interactive — not empty.
              </p>
            </div>

            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-border/50">
              <h2 className="font-display text-2xl">Engineering principle</h2>
              <p className="text-muted-foreground mt-3 leading-relaxed">
                The UI cannot assume perfect data. Schema guard everything. Provide fallbacks.
                Prefer “degrades gracefully” over “crashes loudly.”
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
