import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import heroGradient from "@/assets/hero-gradient.jpg";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function HeroSection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartCreating = () => {
    if (user) {
      document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/auth');
    }
  };

  const handleViewGallery = () => {
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.section 
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
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
          <motion.div 
            className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Creative Portfolio Platform</span>
          </motion.div>
          
          {/* Headline */}
          <motion.h1 
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-balance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            Your work, 
            <br />
            <span className="gradient-text">exhibited.</span>
          </motion.h1>
          
          {/* Subheadline */}
          <motion.p 
            className="text-lg md:text-xl text-[#0f1f3c] max-w-2xl mx-auto text-balance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            Generate stunning websites and landing pages. 
            Curate them into museum-grade portfolios that command attention.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="group text-white"
              onClick={handleStartCreating}
            >
              Get Started
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              variant="hero-outline" 
              size="lg"
              onClick={handleViewGallery}
            >
              View Gallery
            </Button>
          </motion.div>
          
          {/* Stats */}
          <motion.div 
            className="grid grid-cols-3 gap-8 pt-16 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
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
          </motion.div>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-foreground/40 rounded-full animate-bounce" />
        </div>
      </motion.div>
    </motion.section>
  );
}
