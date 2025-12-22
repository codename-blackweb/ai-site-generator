import type { Handler } from "@netlify/functions";
import fs from "node:fs/promises";
import path from "node:path";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, PUT, OPTIONS",
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const uploadsRoot = path.resolve(process.cwd(), "public", "media", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "PUT" && event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const assetId = event.queryStringParameters?.asset ?? "";
  const ext = event.queryStringParameters?.ext ?? "";
  if (!assetId || !ext) {
    return jsonResponse(400, { error: "asset and ext are required" });
  }

  if (!event.body) {
    return jsonResponse(400, { error: "Missing body" });
  }

  const buffer = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");

  if (buffer.length > MAX_BYTES) {
    return jsonResponse(413, { error: "File too large" });
  }

  await fs.mkdir(uploadsRoot, { recursive: true });
  const filename = `${assetId}.${ext}`;
  const filePath = path.join(uploadsRoot, filename);
  await fs.writeFile(filePath, buffer);

  return jsonResponse(200, { ok: true, publicUrl: `/media/uploads/${filename}` });
};
