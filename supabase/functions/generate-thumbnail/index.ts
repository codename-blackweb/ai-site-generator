import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { websiteId, title, description } = await req.json();

    const seed = websiteId || title || crypto.randomUUID();
    const prompt = `Vibrant portfolio cover art for ${title ?? "website"} ${description ?? ""}`.trim();

    // Pollinations gives us a stable, on-demand image without auth.
    const thumbnailUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${encodeURIComponent(seed)}&width=1200&height=800`;

    return new Response(
      JSON.stringify({ thumbnail_url: thumbnailUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("generate-thumbnail error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
