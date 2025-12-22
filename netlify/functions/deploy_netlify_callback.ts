import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { encryptToken, verifyState } from "./deploy_netlify_shared";

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
  "access-control-allow-methods": "GET, OPTIONS",
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const resolveRedirectUri = (event: Parameters<Handler>[0]) => {
  if (process.env.NETLIFY_REDIRECT_URI) {
    return process.env.NETLIFY_REDIRECT_URI;
  }
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host;
  return `${proto}://${host}/.netlify/functions/deploy_netlify_callback`;
};

const buildReturnUrl = (event: Parameters<Handler>[0], returnTo?: string | null) => {
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host;
  const base = `${proto}://${host}`;
  const target = returnTo && returnTo.startsWith("/") ? returnTo : "/";
  const url = new URL(target, base);
  url.searchParams.set("netlify", "connected");
  return url.toString();
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "GET") return jsonResponse(405, { error: "Method not allowed" });

  const code = event.queryStringParameters?.code ?? "";
  const stateParam = event.queryStringParameters?.state ?? "";
  if (!code || !stateParam) {
    return jsonResponse(400, { error: "Missing code or state" });
  }

  const state = verifyState(stateParam);
  if (!state) {
    return jsonResponse(400, { error: "Invalid state" });
  }

  const site = await prisma.site.findUnique({
    where: { id: state.siteId },
    select: { id: true, ownerId: true },
  });
  if (!site) {
    return jsonResponse(404, { error: "Site not found" });
  }
  if (site.ownerId && site.ownerId !== state.userId) {
    return jsonResponse(403, { error: "unauthorized" });
  }
  if (!site.ownerId) {
    await prisma.site.update({
      where: { id: site.id },
      data: { ownerId: state.userId },
    });
  }

  const clientId = process.env.NETLIFY_CLIENT_ID;
  const clientSecret = process.env.NETLIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return jsonResponse(500, { error: "Netlify OAuth is not configured" });
  }

  const redirectUri = resolveRedirectUri(event);

  const tokenResp = await fetch("https://api.netlify.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResp.ok) {
    const detail = await tokenResp.text();
    return jsonResponse(500, { error: "Netlify token exchange failed", details: detail });
  }

  const tokenData = (await tokenResp.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return jsonResponse(500, { error: "Netlify token missing" });
  }

  let encrypted: string;
  try {
    encrypted = encryptToken(tokenData.access_token);
  } catch (error: any) {
    return jsonResponse(500, { error: error?.message || "Token encryption failed" });
  }

  await prisma.deployTarget.upsert({
    where: { siteId_provider: { siteId: state.siteId, provider: "netlify" } },
    update: { tokenRef: encrypted },
    create: {
      siteId: state.siteId,
      provider: "netlify",
      tokenRef: encrypted,
    },
  });

  return {
    statusCode: 302,
    headers: {
      location: buildReturnUrl(event, state.returnTo),
      "cache-control": "no-store",
    },
  };
};
