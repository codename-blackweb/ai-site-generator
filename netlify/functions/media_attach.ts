import type { Handler } from "@netlify/functions";
import { PrismaClient, Prisma } from "@prisma/client";
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

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: { siteId?: string; sectionId?: string; mediaAssetId?: string; conversationId?: string } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const sectionId = typeof body.sectionId === "string" ? body.sectionId.trim() : "";
  const mediaAssetId = typeof body.mediaAssetId === "string" ? body.mediaAssetId.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : null;

  if (!siteId || !sectionId || !mediaAssetId) {
    return jsonResponse(400, { error: "siteId, sectionId, and mediaAssetId are required" });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const [section, mediaAsset] = await Promise.all([
    prisma.section.findUnique({ where: { id: sectionId } }),
    prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } }),
  ]);

  if (!section) return jsonResponse(404, { error: "Section not found" });
  if (!mediaAsset) return jsonResponse(404, { error: "Media asset not found" });

  const page = await prisma.page.findUnique({ where: { id: section.pageId } });
  if (!page || page.siteId !== siteId || mediaAsset.siteId !== siteId) {
    return jsonResponse(400, { error: "Site mismatch" });
  }

  const previousContent = typeof section.content === "object" && section.content ? section.content : {};
  const nextContent = { ...(previousContent as Record<string, unknown>), mediaId: mediaAssetId };

  const updatedSection = await prisma.section.update({
    where: { id: sectionId },
    data: { content: toJson(nextContent) },
  });

  await prisma.sectionContentHistory.create({
    data: {
      siteId,
      sectionId,
      content: toJson(nextContent),
      status: "accepted",
      instruction: "Attach media",
      reason: `Media asset ${mediaAssetId} attached`,
      conversationId,
    },
  });

  await prisma.mutationLog.create({
    data: {
      siteId,
      tool: "attach_media",
      arguments: toJson({ sectionId, mediaAssetId }),
      beforeSnapshot: toJson({ content: previousContent }),
      afterSnapshot: toJson({ content: nextContent }),
      conversationId,
    },
  });

  return jsonResponse(200, {
    updatedSection: {
      sectionInstanceId: updatedSection.id,
      pageId: updatedSection.pageId,
      sectionId: updatedSection.sectionId,
      content: updatedSection.content,
    },
  });
};
