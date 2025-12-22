import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { placeholderPatterns } from "../../src/lib/placeholders";
import { getSectionTemplate } from "../../src/lib/export/sectionComponents";
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

const isPlaceholderString = (value: unknown) => {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return false;
  return placeholderPatterns.some((pattern) => pattern.test(text));
};

const scanForPlaceholders = (value: unknown, count: { total: number }) => {
  if (typeof value === "string") {
    if (isPlaceholderString(value)) count.total += 1;
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanForPlaceholders(item, count));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((entry) => scanForPlaceholders(entry, count));
  }
};

const collectMediaIds = (value: unknown, ids: Set<string>) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.mediaId === "string") {
      ids.add(obj.mediaId);
    }
    Object.values(obj).forEach((entry) => collectMediaIds(entry, ids));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMediaIds(entry, ids));
  }
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: { siteId?: string } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  if (!siteId) return jsonResponse(400, { error: "siteId is required" });

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId);
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      pages: { orderBy: { position: "asc" }, include: { sections: { orderBy: { position: "asc" } } } },
      mediaAssets: true,
    },
  });

  if (!site) return jsonResponse(404, { error: "Site not found" });

  const notes: string[] = [];
  let buildOk = true;

  if (site.state !== "ready") {
    buildOk = false;
    notes.push("Site is still in draft. Complete planning before deploy.");
  }

  if (!site.visualSystem) {
    buildOk = false;
    notes.push("Visual system is missing.");
  }

  const missingRenderers = site.pages
    .flatMap((page) => page.sections)
    .filter((section) => !getSectionTemplate(section.sectionId));
  if (missingRenderers.length > 0) {
    buildOk = false;
    notes.push("One or more sections lack export renderers.");
  }

  const placeholderSections = new Set<string>();
  let placeholderCount = 0;

  for (const page of site.pages) {
    for (const section of page.sections) {
      const counter = { total: 0 };
      scanForPlaceholders(section.content ?? {}, counter);
      if (counter.total > 0) {
        placeholderSections.add(section.sectionId);
        placeholderCount += counter.total;
      }
    }
  }

  const storedMediaIds = new Set<string>(site.mediaAssets.map((asset) => asset.id));
  if (site.media && typeof site.media === "object") {
    const assets = (site.media as { assets?: Array<{ id: string }> }).assets;
    if (Array.isArray(assets)) {
      assets.forEach((asset) => storedMediaIds.add(asset.id));
    }
  }

  const referencedMediaIds = new Set<string>();
  site.pages.forEach((page) =>
    page.sections.forEach((section) => collectMediaIds(section.content ?? {}, referencedMediaIds)),
  );

  const missingMediaSections = new Set<string>();
  referencedMediaIds.forEach((mediaId) => {
    if (!storedMediaIds.has(mediaId)) {
      const section = site.pages
        .flatMap((page) => page.sections)
        .find((item) => (item.content as Record<string, unknown> | null)?.mediaId === mediaId);
      if (section) missingMediaSections.add(section.sectionId);
    }
  });

  const missingMediaCount = referencedMediaIds.size - Array.from(referencedMediaIds).filter((id) => storedMediaIds.has(id)).length;

  if (placeholderCount > 0) {
    notes.push("Placeholders present. Safe to deploy, but replace before launch.");
  }

  if (missingMediaCount > 0) {
    notes.push("Some sections reference missing media.");
  }

  let status: "green" | "yellow" | "red" = "green";
  if (!buildOk) {
    status = "red";
  } else if (placeholderCount > 0 || missingMediaCount > 0) {
    status = "yellow";
  }

  return jsonResponse(200, {
    status,
    build: { ok: buildOk },
    placeholders: {
      count: placeholderCount,
      sections: Array.from(placeholderSections),
    },
    missingMedia: {
      count: missingMediaCount,
      sections: Array.from(missingMediaSections),
    },
    notes,
  });
};
