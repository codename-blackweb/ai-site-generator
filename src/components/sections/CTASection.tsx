import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section id="portfolio" className="py-32 relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Coral glow accent */}
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-exhibit-teal/10 rounded-full blur-[100px]" />
      
      <div className="relative container px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6">
            Ready to exhibit <br />
            <span className="gradient-text">your best work?</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-xl mx-auto">
            Join creative professionals who trust EXHIBIT to present their work 
            with the polish and professionalism it deserves.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" className="group">
              Start Free Trial
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="hero-outline" size="lg">
              Schedule Demo
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-8">
            No credit card required · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
