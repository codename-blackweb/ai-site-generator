import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { requireAuth, requireSiteOwner } from "./auth";
import { signState } from "./deploy_netlify_shared";

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

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Method not allowed" });

  const siteId = event.queryStringParameters?.siteId?.trim() ?? "";
  const returnToRaw = event.queryStringParameters?.returnTo ?? "";
  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : undefined;

  if (!siteId) return jsonResponse(400, { error: "siteId is required" });

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const clientId = process.env.NETLIFY_CLIENT_ID;
  if (!clientId) {
    return jsonResponse(500, { error: "NETLIFY_CLIENT_ID is not configured" });
  }

  let state: string;
  try {
    state = signState({ siteId, userId: auth.session.userId, ts: Date.now(), returnTo });
  } catch (error: any) {
    return jsonResponse(500, { error: error?.message || "Failed to create OAuth state" });
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "sites:write,deploys:write",
    state,
  });

  const redirectUrl = `https://app.netlify.com/authorize?${params.toString()}`;

  return jsonResponse(200, { redirectUrl });
};
