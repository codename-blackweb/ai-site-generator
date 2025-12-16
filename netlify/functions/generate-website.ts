import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  console.log("OPENAI_API_KEY present:", !!process.env.OPENAI_API_KEY);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      message: "generate-website function is alive",
    }),
  };
};
