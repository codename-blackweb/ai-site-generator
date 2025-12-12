import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectName, industry, audience, goal, tone, colors, layout } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const generatedContent = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ generatedContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
