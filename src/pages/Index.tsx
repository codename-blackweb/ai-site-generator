import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/sections/HeroSection";
import { GeneratorSection } from "@/components/sections/GeneratorSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { CTASection } from "@/components/sections/CTASection";
import { FooterSection } from "@/components/sections/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />
      
      <Header />
      
      <main>
        <HeroSection />
        <FeaturesSection />
        <GeneratorSection />
        <GallerySection />
        <CTASection />
      </main>
      
      <FooterSection />
    </div>
  );
};

export default Index;
