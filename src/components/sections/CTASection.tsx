import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function CTASection() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartCreating = () => {
    if (user) {
      document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/auth');
    }
  };

  return (
    <motion.section 
      id="portfolio" 
      className="py-32 relative overflow-hidden"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient" />
      
      {/* Coral glow accent */}
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-exhibit-teal/10 rounded-full blur-[100px]" />
      
      <div className="relative container px-6">
        <motion.div 
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-6">
            Ready to exhibit <br />
            <span className="gradient-text">your best work?</span>
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-xl mx-auto">
            Join creative professionals who trust EXHIBIT to present their work 
            with the polish and professionalism it deserves.
          </p>
          
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.32, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="group"
              onClick={handleStartCreating}
            >
              Start Creating
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <a href="#features">
              <Button variant="hero-outline" size="lg">
                Learn More
              </Button>
            </a>
          </motion.div>
          
          <motion.p 
            className="text-sm text-muted-foreground mt-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.32, delay: 0.2 }}
          >
            No credit card required · Cancel anytime
          </motion.p>
        </motion.div>
      </div>
    </motion.section>
  );
}
