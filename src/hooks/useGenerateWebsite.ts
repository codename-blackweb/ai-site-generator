import { useCallback, useState } from "react";
interface GenerateWebsitePayload {
  projectName: string;
  description: string;
}

const buildFallbackSite = (projectName: string, goal: string) => {
  const safeName = projectName || "Your Project";
  const safeGoal = goal || "launch a modern website";

  return {
    hero: {
      headline: `${safeName} — ${safeGoal}`,
      subheadline: `A modern experience built to help you ${safeGoal}.`,
      ctaPrimary: "Explore",
      ctaSecondary: "Learn more",
    },
    about: {
      title: `About ${safeName}`,
      description: `${safeName} focuses on helping you ${safeGoal} with a clean, goal-driven experience.`,
    },
    features: [
      {
        title: "Purpose-built layout",
        description: "Responsive, fast, and focused on your primary CTA.",
        icon: "layout",
      },
      {
        title: "Clear storytelling",
        description: `Content that explains how you ${safeGoal} for your audience.`,
        icon: "message-square",
      },
      {
        title: "Built for conversion",
        description: "Guides visitors to take action with straightforward CTAs.",
        icon: "sparkles",
      },
    ],
    testimonials: [
      {
        quote: `${safeName} helped us launch quickly and communicate clearly.`,
        author: "A happy customer",
        role: "Founder",
      },
    ],
    cta: {
      headline: `Ready to ${safeGoal}?`,
      description: "Launch a clean, modern page tailored to your goal.",
      buttonText: "Get started",
    },
    footer: {
      tagline: `${safeName} — built with intent.`,
    },
    metadata: {
      primaryColor: "#6B73FF",
      secondaryColor: "#8B5CF6",
      suggestedFont: "Space Grotesk",
    },
  };
};

export function useGenerateWebsite() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateWebsite = useCallback(async (payload: GenerateWebsitePayload) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/.netlify/functions/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: payload.projectName,
          goal: payload.description,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Website generator returned an error.");
      }

      const data = await response.json();

      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }

      const generated = (data as any)?.generatedContent ?? buildFallbackSite(payload.projectName, payload.description);
      if (!generated) {
        throw new Error("No website content was returned from the generator.");
      }

      return generated;
    } catch (err: any) {
      const message = err?.message ?? "Website generation failed.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateWebsite,
    isGenerating,
    error,
  };
}
