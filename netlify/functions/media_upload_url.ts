import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
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
  "access-control-allow-methods": "POST, OPTIONS",
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const allowedRoles = new Set(["hero", "section", "background"]);
const mimeToExt: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: { siteId?: string; mime?: string; role?: string } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const mime = typeof body.mime === "string" ? body.mime.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";

  if (!siteId) return jsonResponse(400, { error: "siteId is required" });

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });
  if (!allowedRoles.has(role)) return jsonResponse(400, { error: "Invalid role" });
  if (!mimeToExt[mime]) return jsonResponse(400, { error: "Unsupported mime type" });

  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) return jsonResponse(404, { error: "Site not found" });

  const assetId = crypto.randomUUID();
  const ext = mimeToExt[mime];
  const publicUrl = `/media/uploads/${assetId}.${ext}`;
  const uploadUrl = `/api/media/upload?asset=${assetId}&ext=${ext}&siteId=${encodeURIComponent(siteId)}`;

  return jsonResponse(200, { uploadUrl, publicUrl, assetId });
};
