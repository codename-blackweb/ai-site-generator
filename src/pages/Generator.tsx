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
    <main className="min-h-[calc(100vh-80px)]">
      <GeneratorSection templatePreset={template} />
    </main>
  );
}

export default GeneratorPage;
