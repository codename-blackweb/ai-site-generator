import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/sections/HeroSection";
import { GeneratorSection } from "@/components/sections/GeneratorSection";
import { GallerySection } from "@/components/sections/GallerySection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { CTASection } from "@/components/sections/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <HeroSection />
        <FeaturesSection />
        <GeneratorSection />
        <GallerySection />
        <CTASection />
      </main>
    </div>
  );
};

export default Index;
