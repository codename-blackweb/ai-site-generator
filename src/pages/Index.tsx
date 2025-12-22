import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/sections/HeroSection";
import { GeneratorSection } from "@/components/sections/GeneratorSection";
import GallerySection from "@/components/sections/GallerySection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { CTASection } from "@/components/sections/CTASection";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const section = (location.state as any)?.scrollTo as string | undefined;
    if (section) {
      // Scroll after paint to ensure elements exist
      requestAnimationFrame(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      });
      navigate(".", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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
