import type { Handler } from "@netlify/functions";
import { PrismaClient, Prisma } from "@prisma/client";
import path from "path";
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
  datasources: {
    db: { url: resolveDatabaseUrl() },
  },
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "POST, OPTIONS",
};

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: {
    siteId?: string;
    sectionInstanceId?: string;
    conversationId?: string;
  } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const sectionInstanceId = typeof body.sectionInstanceId === "string" ? body.sectionInstanceId.trim() : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : null;

  if (!siteId || !sectionInstanceId) {
    return jsonResponse(400, { error: "siteId and sectionInstanceId are required." });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId);
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const section = await prisma.section.findUnique({
    where: { id: sectionInstanceId },
    include: { Page: true },
  });

  if (!section || section.Page.siteId !== siteId) {
    return jsonResponse(404, { error: "Section not found for this site." });
  }

  const history = await prisma.sectionContentHistory.findMany({
    where: { siteId, sectionId: sectionInstanceId, status: "accepted" },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  if (history.length < 2) {
    return jsonResponse(400, { error: "Nothing to undo." });
  }

  const current = history[0];
  const previous = history[1];

  await prisma.section.update({
    where: { id: sectionInstanceId },
    data: { content: toJson(previous.content) },
  });

  await prisma.sectionContentHistory.create({
    data: {
      siteId,
      sectionId: sectionInstanceId,
      content: toJson(previous.content),
      status: "accepted",
      instruction: "UNDO",
      reason: "Reverted to previous accepted content",
      conversationId,
    },
  });

  await prisma.mutationLog.create({
    data: {
      siteId,
      tool: "sectionUndo",
      arguments: toJson({
        sectionInstanceId,
      }),
      beforeSnapshot: toJson({
        sectionInstanceId,
        content: current.content,
      }),
      afterSnapshot: toJson({
        sectionInstanceId,
        content: previous.content,
      }),
      conversationId,
    },
  });

  return jsonResponse(200, {
    siteId,
    conversationId,
    updatedSection: {
      sectionInstanceId,
      pageId: section.Page.pageId,
      sectionId: section.sectionId,
      content: previous.content,
    },
  });
};
