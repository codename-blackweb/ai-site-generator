import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { handler as exportHandler } from "./export_site";
import { decryptToken } from "./deploy_netlify_shared";
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
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureExportZip = async (siteId: string, exportId: string, authHeader: string) => {
  const zipPath = path.join("/tmp/exports", `${exportId}.zip`);
  try {
    await fs.stat(zipPath);
    return zipPath;
  } catch {
    const response = await exportHandler({
      httpMethod: "POST",
      body: JSON.stringify({ siteId, target: "vite-react" }),
      headers: { authorization: authHeader },
    } as Parameters<typeof exportHandler>[0]);

    if (!response || response.statusCode !== 200) {
      const detail = response?.body || "";
      throw new Error(`Export failed: ${detail}`);
    }

    return path.join("/tmp/exports", `${siteId}.zip`);
  }
};

const netlifyRequest = async (token: string, url: string, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Netlify request failed: ${detail}`);
  }

  return response.json();
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const authHeader = event.headers.authorization || event.headers.Authorization || "";

  if (event.httpMethod === "GET") {
    const siteId = event.queryStringParameters?.siteId?.trim() ?? "";
    if (!siteId) return jsonResponse(400, { error: "siteId is required" });

    const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
    if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

    const target = await prisma.deployTarget.findUnique({
      where: { siteId_provider: { siteId, provider: "netlify" } },
    });

    return jsonResponse(200, {
      connected: !!target,
      providerSiteId: target?.providerSiteId ?? null,
    });
  }

  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: { siteId?: string; exportId?: string } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const exportId = typeof body.exportId === "string" ? body.exportId.trim() : siteId;

  if (!siteId) return jsonResponse(400, { error: "siteId is required" });

  const site = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
  if (!site) return jsonResponse(404, { error: "Site not found" });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const target = await prisma.deployTarget.findUnique({
    where: { siteId_provider: { siteId, provider: "netlify" } },
  });
  if (!target) {
    return jsonResponse(409, { error: "Netlify is not connected for this site" });
  }

  let token: string;
  try {
    token = decryptToken(target.tokenRef);
  } catch (error: any) {
    return jsonResponse(500, { error: error?.message || "Failed to decrypt Netlify token" });
  }

  try {
    const zipPath = await ensureExportZip(siteId, exportId || siteId, authHeader);
    const zipBuffer = await fs.readFile(zipPath);

    let providerSiteId = target.providerSiteId;
    if (!providerSiteId) {
      const created = await netlifyRequest(token, "https://api.netlify.com/api/v1/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      providerSiteId = created?.id;
      if (!providerSiteId) {
        throw new Error("Netlify site creation failed");
      }
      await prisma.deployTarget.update({
        where: { id: target.id },
        data: { providerSiteId },
      });
    }

    const deploy = await netlifyRequest(
      token,
      `https://api.netlify.com/api/v1/sites/${providerSiteId}/deploys`,
      {
        method: "POST",
        headers: { "content-type": "application/zip" },
        body: zipBuffer,
      },
    );

    const deployId = deploy?.id;
    if (!deployId) {
      throw new Error("Netlify deploy creation failed");
    }

    let status = deploy?.state;
    let attempts = 0;
    let deployInfo = deploy;

    while (status !== "ready" && status !== "error" && status !== "failed" && attempts < 20) {
      await wait(2000);
      deployInfo = await netlifyRequest(token, `https://api.netlify.com/api/v1/deploys/${deployId}`);
      status = deployInfo?.state;
      attempts += 1;
    }

    if (status !== "ready") {
      throw new Error(`Netlify deploy failed with status: ${status || "unknown"}`);
    }

    const deployUrl =
      deployInfo?.deploy_ssl_url || deployInfo?.deploy_url || deployInfo?.url || deployInfo?.ssl_url || null;
    const adminUrl =
      deployInfo?.admin_url ||
      (providerSiteId ? `https://app.netlify.com/sites/${providerSiteId}` : null);

    return jsonResponse(200, {
      status: "success",
      deployUrl,
      adminUrl,
    });
  } catch (error: any) {
    return jsonResponse(500, {
      status: "error",
      message: "Netlify deploy failed",
      details: error?.message || "Unknown error",
    });
  }
};
