import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Wand2, Layout, Palette, Target, Users, Building2 } from "lucide-react";

const industries = [
  "Technology", "Creative Agency", "E-commerce", "Healthcare", 
  "Finance", "Education", "Real Estate", "Hospitality"
];

const tones = [
  { id: "professional", label: "Professional", icon: Building2 },
  { id: "creative", label: "Creative", icon: Palette },
  { id: "minimal", label: "Minimal", icon: Layout },
  { id: "bold", label: "Bold", icon: Target },
];

const layouts = [
  "Hero + Features",
  "Storytelling",
  "Product Showcase",
  "Portfolio Grid",
];

export function GeneratorSection() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    projectName: "",
    industry: "",
    audience: "",
    goal: "",
    tone: "",
    colors: "",
    layout: "",
  });

  const updateForm = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <section id="generator" className="py-32 relative">
      <div className="absolute inset-0 mesh-gradient opacity-50" />
      
      <div className="relative container px-6">
        <div className="max-w-3xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-2 mb-6">
              <Wand2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">AI Generator</span>
            </div>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-4">
              Create in seconds
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tell us about your project and watch as AI crafts a stunning website tailored to your vision.
            </p>
          </div>

          {/* Generator form */}
          <div className="glass-panel rounded-3xl p-8 md:p-12">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-12">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-medium ${
                      s <= step 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div className={`w-24 md:w-32 h-0.5 mx-2 transition-colors duration-medium ${
                      s < step ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Basics */}
            {step === 1 && (
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-3">
                  <Label htmlFor="projectName" className="text-base">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g., Acme Studio"
                    value={formData.projectName}
                    onChange={(e) => updateForm("projectName", e.target.value)}
                    className="h-14 text-lg bg-secondary/50 border-border/50"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Industry</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {industries.map((industry) => (
                      <button
                        key={industry}
                        onClick={() => updateForm("industry", industry)}
                        className={`p-4 rounded-xl text-sm text-center transition-all duration-medium ${
                          formData.industry === industry
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="audience" className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Target Audience
                  </Label>
                  <Input
                    id="audience"
                    placeholder="e.g., Small business owners, startups"
                    value={formData.audience}
                    onChange={(e) => updateForm("audience", e.target.value)}
                    className="h-14 text-lg bg-secondary/50 border-border/50"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Goals & Tone */}
            {step === 2 && (
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-3">
                  <Label htmlFor="goal" className="text-base">Primary Goal</Label>
                  <Textarea
                    id="goal"
                    placeholder="What should visitors do? e.g., Book a consultation, sign up for newsletter..."
                    value={formData.goal}
                    onChange={(e) => updateForm("goal", e.target.value)}
                    className="min-h-[120px] text-lg bg-secondary/50 border-border/50 resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base">Brand Tone</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {tones.map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => updateForm("tone", id)}
                        className={`p-6 rounded-xl flex items-center gap-4 transition-all duration-medium ${
                          formData.tone === id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-lg">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Design Preferences */}
            {step === 3 && (
              <div className="space-y-8 animate-fade-in">
                <div className="space-y-3">
                  <Label htmlFor="colors" className="text-base flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color Preferences (optional)
                  </Label>
                  <Input
                    id="colors"
                    placeholder="e.g., Navy blue, coral accents, or leave blank for AI suggestions"
                    value={formData.colors}
                    onChange={(e) => updateForm("colors", e.target.value)}
                    className="h-14 text-lg bg-secondary/50 border-border/50"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base flex items-center gap-2">
                    <Layout className="w-4 h-4" />
                    Layout Style
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {layouts.map((layout) => (
                      <button
                        key={layout}
                        onClick={() => updateForm("layout", layout)}
                        className={`p-5 rounded-xl text-center transition-all duration-medium ${
                          formData.layout === layout
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Ready to generate your website? This will create a fully designed, production-ready page.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-border/50">
              {step > 1 ? (
                <Button 
                  variant="ghost" 
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <Button 
                  variant="coral"
                  onClick={() => setStep(step + 1)}
                  className="group"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button 
                  variant="coral"
                  size="lg"
                  className="group animate-pulse-glow"
                >
                  <Wand2 className="w-5 h-5" />
                  Generate Website
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
