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
  "access-control-allow-methods": "GET, OPTIONS",
};

const fileHeaders = {
  "content-type": "application/zip",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET, OPTIONS",
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const parseExportId = (pathValue?: string | null) => {
  if (!pathValue) return "";
  const parts = pathValue.split("/").filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.replace(/\.zip$/i, "");
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Method not allowed" });

  const exportId = parseExportId(event.path);
  if (!exportId) {
    return jsonResponse(400, { error: "Missing export id" });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, exportId, auth.session.userId);
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const zipPath = path.join("/tmp/exports", `${exportId}.zip`);
  let file: Buffer;
  try {
    file = await fs.readFile(zipPath);
  } catch {
    return jsonResponse(404, { error: "Export not found" });
  }

  return {
    statusCode: 200,
    headers: {
      ...fileHeaders,
      "content-disposition": `attachment; filename="${exportId}.zip"`,
    },
    body: file.toString("base64"),
    isBase64Encoded: true,
  };
};
