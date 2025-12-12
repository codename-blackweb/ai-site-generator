import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroGradient from "@/assets/hero-gradient.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background gradient image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroGradient})` }}
      />
      
      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      
      {/* Content */}
      <div className="relative z-10 container px-6 pt-32 pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-2 opacity-0 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">AI-Powered Creative Platform</span>
          </div>
          
          {/* Headline */}
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-balance opacity-0 animate-fade-in-up [animation-delay:0.1s]">
            Your work, 
            <br />
            <span className="gradient-text">exhibited.</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance opacity-0 animate-fade-in-up [animation-delay:0.2s]">
            Generate stunning websites and landing pages with AI. 
            Curate them into museum-grade portfolios that command attention.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 opacity-0 animate-fade-in-up [animation-delay:0.3s]">
            <Button variant="hero" size="lg" className="group">
              Start Creating
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button variant="hero-outline" size="lg">
              View Gallery
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-16 max-w-lg mx-auto opacity-0 animate-fade-in-up [animation-delay:0.4s]">
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl text-foreground">2.4k</div>
              <div className="text-sm text-muted-foreground mt-1">Sites Created</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl text-foreground">180+</div>
              <div className="text-sm text-muted-foreground mt-1">Portfolios</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl md:text-4xl text-foreground">4.9</div>
              <div className="text-sm text-muted-foreground mt-1">Rating</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in [animation-delay:1s]">
        <div className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-foreground/40 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
