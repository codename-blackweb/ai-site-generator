import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildFallbackSite({
  projectName,
  industry,
  audience,
  goal,
  tone,
  colors,
  layout,
}: {
  projectName?: string;
  industry?: string;
  audience?: string;
  goal?: string;
  tone?: string;
  colors?: string;
  layout?: string;
}) {
  const palette = (colors?.split(",") ?? []).map((c) => c.trim()).filter(Boolean);
  const primaryColor = palette[0] || "#6B73FF";
  const secondaryColor = palette[1] || "#8B5CF6";
  const cleanName = projectName || "Your Project";
  const cleanGoal = goal || "launch a modern website";
  const cleanIndustry = industry || "digital brand";
  const cleanAudience = audience || "customers";
  const cleanTone = tone || "modern and confident";
  const cleanLayout = layout || "modern";

  return {
    hero: {
      headline: `${cleanName} — built to ${cleanGoal}`,
      subheadline: `A ${cleanTone} ${cleanIndustry} experience crafted for ${cleanAudience}.`,
      ctaPrimary: "Explore the site",
      ctaSecondary: "Learn more",
    },
    about: {
      title: `Why ${cleanName}?`,
      description:
        `${cleanName} is focused on ${cleanGoal}. We combine expertise in ${cleanIndustry} with a clear narrative so ${cleanAudience} understand the value instantly.`,
    },
    features: [
      {
        title: "Purpose-built story",
        description: `Content structured around your goal of ${cleanGoal}, written in a ${cleanTone} tone.`,
        icon: "target",
      },
      {
        title: "Clean, responsive layout",
        description: `A ${cleanLayout} layout that adapts to any device and keeps visitors focused on your call to action.`,
        icon: "layout",
      },
      {
        title: "Trust-building elements",
        description: `Testimonials, clear outcomes, and supporting details that speak directly to ${cleanAudience}.`,
        icon: "shield",
      },
    ],
    testimonials: [
      {
        quote: `${cleanName} helped us move faster and communicate clearly — exactly what our ${cleanAudience} needed.`,
        author: "A satisfied customer",
        role: "Founder",
      },
    ],
    cta: {
      headline: `Ready to ${cleanGoal}?`,
      description: `Take the next step with a ${cleanTone} experience tailored to ${cleanAudience}.`,
      buttonText: "Get started",
    },
    footer: {
      tagline: `${cleanName} — built with intent.`,
    },
    metadata: {
      primaryColor,
      secondaryColor,
      suggestedFont: "Space Grotesk",
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { projectName, industry, audience, goal, tone, colors, layout } = await req.json();
    if (!projectName || !goal) {
      return new Response(
        JSON.stringify({ error: "projectName and goal are required to generate a website." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const respondWithContent = (content: unknown, status = 200) =>
      new Response(JSON.stringify({ generatedContent: content }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const fallbackContent = buildFallbackSite({
      projectName,
      industry,
      audience,
      goal,
      tone,
      colors,
      layout,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY is not configured; returning fallback website content.");
      return respondWithContent(fallbackContent);
    }

    console.log("Generating website for:", projectName);

    const systemPrompt = `You are an expert web designer and copywriter. Generate a complete, production-ready website structure based on the user's requirements.

Return a JSON object with this structure:
{
  "hero": {
    "headline": "Main headline text",
    "subheadline": "Supporting text",
    "ctaPrimary": "Primary button text",
    "ctaSecondary": "Secondary button text"
  },
  "about": {
    "title": "Section title",
    "description": "Detailed description paragraph"
  },
  "features": [
    { "title": "Feature name", "description": "Feature description", "icon": "icon-name" }
  ],
  "testimonials": [
    { "quote": "Testimonial text", "author": "Author name", "role": "Author role" }
  ],
  "cta": {
    "headline": "CTA headline",
    "description": "CTA supporting text",
    "buttonText": "CTA button text"
  },
  "footer": {
    "tagline": "Company tagline"
  },
  "metadata": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "suggestedFont": "font-name"
  }
}

Create compelling, professional copy that matches the brand tone. Be specific and avoid generic placeholder text.`;

    const userPrompt = `Create a ${layout || 'modern'} website for:
- Project: ${projectName}
- Industry: ${industry}
- Target Audience: ${audience}
- Primary Goal: ${goal}
- Brand Tone: ${tone}
- Color Preferences: ${colors || 'AI suggestions welcome'}

Generate engaging, specific content that will resonate with the target audience and achieve the primary goal.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_website_content",
              description: "Generate complete website content structure",
              parameters: {
                type: "object",
                properties: {
                  hero: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      subheadline: { type: "string" },
                      ctaPrimary: { type: "string" },
                      ctaSecondary: { type: "string" },
                    },
                    required: ["headline", "subheadline", "ctaPrimary"],
                  },
                  about: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["title", "description"],
                  },
                  features: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        icon: { type: "string" },
                      },
                      required: ["title", "description"],
                    },
                  },
                  testimonials: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        quote: { type: "string" },
                        author: { type: "string" },
                        role: { type: "string" },
                      },
                      required: ["quote", "author"],
                    },
                  },
                  cta: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      description: { type: "string" },
                      buttonText: { type: "string" },
                    },
                    required: ["headline", "buttonText"],
                  },
                  footer: {
                    type: "object",
                    properties: {
                      tagline: { type: "string" },
                    },
                  },
                  metadata: {
                    type: "object",
                    properties: {
                      primaryColor: { type: "string" },
                      secondaryColor: { type: "string" },
                      suggestedFont: { type: "string" },
                    },
                  },
                },
                required: ["hero", "about", "features", "cta"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_website_content" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return respondWithContent(fallbackContent);
    }

    const data = await response.json();
    console.log("AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.warn("No tool call in AI response; using fallback content.");
      return respondWithContent(fallbackContent);
    }

    const generatedContent = JSON.parse(toolCall.function.arguments);

    return respondWithContent(generatedContent);
  } catch (error) {
    console.error("Error in generate-website function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
