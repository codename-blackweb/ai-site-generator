import { GeneratorSection } from "@/components/sections/GeneratorSection";
import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { getTemplateBySlug } from "@/data/templates";

export function GeneratorPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const templateSlug = params.get("template");
  const template = useMemo(() => (templateSlug ? getTemplateBySlug(templateSlug) : undefined), [templateSlug]);

  return (
    <main className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-black">
      {/* Full-viewport background video */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-80"
          src="https://res.cloudinary.com/dwrdmqonu/video/upload/v1765953115/Video_nzwqfz.mov"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 pointer-events-none" />
      </div>

      <div className="relative z-10">
        <GeneratorSection templatePreset={template} />
      </div>
    </main>
  );
}

export default GeneratorPage;
