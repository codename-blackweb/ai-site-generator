import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

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

const uploadsRoot = path.resolve(process.cwd(), "public", "media", "uploads");

const extFromMime = (mime: string | null | undefined) => {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    default:
      return "";
  }
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const assetId = event.queryStringParameters?.assetId ?? "";
  if (!assetId) {
    return { statusCode: 400, body: "assetId is required" };
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { statusCode: 404, body: "Not found" };
  }

  const ext = extFromMime(asset.mime);
  if (!ext) {
    return { statusCode: 400, body: "Unsupported media type" };
  }

  const filePath = path.join(uploadsRoot, `${assetId}.${ext}`);
  try {
    const file = await fs.readFile(filePath);
    return {
      statusCode: 200,
      headers: {
        "content-type": asset.mime || "application/octet-stream",
        "cache-control": "public, max-age=3600",
      },
      body: file.toString("base64"),
      isBase64Encoded: true,
    };
  } catch {
    return { statusCode: 404, body: "File not found" };
  }
};
