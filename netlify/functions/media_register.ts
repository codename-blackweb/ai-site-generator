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

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const uploadsRoot = path.resolve(process.cwd(), "public", "media", "uploads");

const parseFilename = (src: string) => {
  if (!src.startsWith("/media/uploads/")) return null;
  return src.replace("/media/uploads/", "");
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: {
    siteId?: string;
    role?: string;
    kind?: string;
    src?: string;
    alt?: string;
    caption?: string;
    mime?: string;
  } = {};

  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  const src = typeof body.src === "string" ? body.src.trim() : "";
  const alt = typeof body.alt === "string" ? body.alt.trim() : null;
  const caption = typeof body.caption === "string" ? body.caption.trim() : null;
  const mime = typeof body.mime === "string" ? body.mime.trim().toLowerCase() : null;

  if (!siteId || !role || !kind || !src) {
    return jsonResponse(400, { error: "siteId, role, kind, and src are required" });
  }

  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) return jsonResponse(404, { error: "Site not found" });

  let bytes: number | null = null;
  const filename = parseFilename(src);
  if (filename) {
    try {
      const stat = await fs.stat(path.join(uploadsRoot, filename));
      bytes = stat.size;
    } catch {
      bytes = null;
    }
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      siteId,
      role,
      kind,
      src,
      alt,
      caption,
      status: "user",
      mime,
      bytes,
    },
  });

  return jsonResponse(200, { asset });
};
