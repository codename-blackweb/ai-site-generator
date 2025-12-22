import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { requireAuth, requireSiteOwner } from "./auth";

const resolveDatabaseUrl = (): string => {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (rawUrl && rawUrl.startsWith("file:")) {
    const filePath = rawUrl.slice("file:".length);
    if (filePath.startsWith("/")) {
      return rawUrl;
    }
    return `file:${path.resolve(process.cwd(), filePath)}`;
  }
  return `file:${path.resolve(process.cwd(), "prisma", "dev.db")}`;
};

const prisma = new PrismaClient({
  datasources: { db: { url: resolveDatabaseUrl() } },
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
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
  const siteId = event.queryStringParameters?.siteId?.trim() ?? "";
  if (!assetId || !ext || !siteId) {
    return jsonResponse(400, { error: "asset, ext, and siteId are required" });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

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
