import type { Handler } from "@netlify/functions";
import { PrismaClient, Prisma } from "@prisma/client";
import OpenAI from "openai";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { DesignIntent } from "../../src/lib/designIntent";
import type { VisualSystem } from "../../src/lib/visualSystem";
import { generateVisualSystem } from "../../src/lib/visualSystem";
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
const uploadsRoot = path.resolve(process.cwd(), "public", "media", "uploads");
const outputWidths = [640, 960, 1280, 1920];

const defaultIntent: DesignIntent = {
  visualGravity: "balanced",
  motionEnergy: "guided",
  spatialDensity: "neutral",
  emotionalTemperature: "neutral",
  prestigeLevel: "professional",
};

const toJson = (value: unknown) => value as Prisma.InputJsonValue;

const inferContrast = (intent: DesignIntent) => {
  if (intent.visualGravity === "expressive") return "high";
  if (intent.visualGravity === "minimal") return "low";
  return "medium";
};

const inferMood = (intent: DesignIntent) => {
  const temperature =
    intent.emotionalTemperature === "cool"
      ? "cool and calm"
      : intent.emotionalTemperature === "warm"
        ? "warm and inviting"
        : "balanced and neutral";
  const prestige =
    intent.prestigeLevel === "luxury"
      ? "cinematic, premium"
      : intent.prestigeLevel === "utilitarian"
        ? "simple, utilitarian"
        : "professional, editorial";
  return `${temperature}, ${prestige}`;
};

const inferComposition = (role: string) => {
  if (role === "hero") return "wide framing, negative space, center-weighted";
  if (role === "background") return "ambient texture, low detail, soft gradients";
  return "balanced framing, gentle depth, subtle focal point";
};

const hasFacts = (facts: unknown) => {
  if (!facts || typeof facts !== "object") return false;
  return Object.values(facts as Record<string, unknown>).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number" || typeof value === "boolean") return true;
    if (value && typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
    return false;
  });
};

const buildPrompt = (params: {
  role: string;
  intent: DesignIntent;
  visualSystem: VisualSystem;
  facts: unknown;
  intentHint?: string | null;
}) => {
  const palette = [
    params.visualSystem.color.background,
    params.visualSystem.color.surface,
    params.visualSystem.color.primary,
    params.visualSystem.color.accent,
    params.visualSystem.color.muted,
  ].filter(Boolean);

  const contrast = inferContrast(params.intent);
  const mood = inferMood(params.intent);
  const composition = inferComposition(params.role);
  const paletteText = palette.length ? palette.join(", ") : "neutral tones";
  const factsPresent = hasFacts(params.facts);
  const factsText = factsPresent ? JSON.stringify(params.facts) : "none";
  const intentHint = params.intentHint ? params.intentHint.trim().slice(0, 140) : "";

  return (
    `Create a high-resolution, editorial-grade image suitable for a website ${params.role} background.\n` +
    `Visual constraints:\n` +
    `- Color palette: ${paletteText}\n` +
    `- Contrast: ${contrast}\n` +
    `- Mood: ${mood}\n` +
    `- Composition: ${composition}\n` +
    `Content constraints:\n` +
    `- Do not include text, logos, brands, or identifiable people\n` +
    `- Do not depict specific products, locations, or claims\n` +
    `- Avoid literal or fabricated specifics\n` +
    (intentHint ? `- Creative direction: ${intentHint} (interpret abstractly)\n` : "") +
    `Known facts (use only if provided; do not invent): ${factsText}\n` +
    (factsPresent
      ? `Use facts only as broad inspiration. Do not add specifics beyond them.\n`
      : `Facts are missing, stay abstract and atmospheric.\n`) +
    `Output: realistic photographic style, professional lighting, production-ready.`
  );
};

const getImageBuffer = async (openai: OpenAI, prompt: string) => {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const primarySize = process.env.OPENAI_IMAGE_SIZE || "1792x1024";
  const fallbackSize = "1024x1024";

  const run = async (size: string) => {
    const response = await openai.images.generate({
      model,
      prompt,
      size,
      response_format: "b64_json",
    });
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("Image generation returned no data");
    }
    return Buffer.from(b64, "base64");
  };

  try {
    return await run(primarySize);
  } catch {
    return await run(fallbackSize);
  }
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: { siteId?: string; role?: string; sectionId?: string; intentHint?: string } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  const sectionId = typeof body.sectionId === "string" ? body.sectionId.trim() : null;
  const intentHint = typeof body.intentHint === "string" ? body.intentHint.trim() : null;

  if (!siteId) return jsonResponse(400, { error: "siteId is required" });
  if (!allowedRoles.has(role)) return jsonResponse(400, { error: "Invalid role" });

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId, { allowClaim: true });
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse(500, { error: "OPENAI_API_KEY is not configured" });
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { designIntent: true, visualSystem: true, facts: true },
  });
  if (!site) return jsonResponse(404, { error: "Site not found" });

  const intent = (site.designIntent as DesignIntent) ?? defaultIntent;
  const visualSystem =
    site.visualSystem && typeof site.visualSystem === "object"
      ? (site.visualSystem as VisualSystem)
      : generateVisualSystem(intent);

  const prompt = buildPrompt({
    role,
    intent,
    visualSystem,
    facts: site.facts,
    intentHint,
  });

  const job = await prisma.mediaJob.create({
    data: {
      siteId,
      role,
      status: "queued",
      input: toJson({ siteId, role, sectionId, intentHint }),
    },
  });

  try {
    await prisma.mediaJob.update({
      where: { id: job.id },
      data: { status: "running" },
    });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const rawBuffer = await getImageBuffer(openai, prompt);

    await fs.mkdir(uploadsRoot, { recursive: true });

    const assetId = crypto.randomUUID();
    const baseImage = sharp(rawBuffer).rotate();

    const variants: Array<{
      format: "webp" | "avif";
      width: number;
      height: number;
      bytes: number;
      path: string;
    }> = [];

    let baseWebp: Buffer | null = null;
    let baseAvif: Buffer | null = null;
    let baseMeta: { width: number; height: number } | null = null;

    for (const width of outputWidths) {
      const resized = baseImage.clone().resize({ width });

      const webpBuffer = await resized.clone().webp({ quality: 82 }).toBuffer();
      const webpMeta = await sharp(webpBuffer).metadata();
      const webpName = `${assetId}-${width}.webp`;
      await fs.writeFile(path.join(uploadsRoot, webpName), webpBuffer);
      variants.push({
        format: "webp",
        width: webpMeta.width ?? width,
        height: webpMeta.height ?? width,
        bytes: webpBuffer.length,
        path: `/media/uploads/${webpName}`,
      });

      const avifBuffer = await resized.clone().avif({ quality: 60 }).toBuffer();
      const avifMeta = await sharp(avifBuffer).metadata();
      const avifName = `${assetId}-${width}.avif`;
      await fs.writeFile(path.join(uploadsRoot, avifName), avifBuffer);
      variants.push({
        format: "avif",
        width: avifMeta.width ?? width,
        height: avifMeta.height ?? width,
        bytes: avifBuffer.length,
        path: `/media/uploads/${avifName}`,
      });

      if (width === 1920) {
        baseWebp = webpBuffer;
        baseAvif = avifBuffer;
        baseMeta = {
          width: webpMeta.width ?? width,
          height: webpMeta.height ?? width,
        };
      }
    }

    if (!baseWebp || !baseMeta) {
      throw new Error("Image processing failed to produce base assets");
    }

    await fs.writeFile(path.join(uploadsRoot, `${assetId}.webp`), baseWebp);
    if (baseAvif) {
      await fs.writeFile(path.join(uploadsRoot, `${assetId}.avif`), baseAvif);
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        id: assetId,
        siteId,
        role,
        kind: "image",
        src: `/media/uploads/${assetId}.webp`,
        status: "generated",
        width: baseMeta.width,
        height: baseMeta.height,
        mime: "image/webp",
        bytes: baseWebp.length,
      },
    });

    await prisma.mediaJob.update({
      where: { id: job.id },
      data: {
        status: "succeeded",
        output: toJson({
          assetId,
          src: asset.src,
          variants,
        }),
      },
    });

    return jsonResponse(200, { jobId: job.id, asset });
  } catch (error: any) {
    await prisma.mediaJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: error?.message || "Generation failed",
      },
    });

    return jsonResponse(500, { error: error?.message || "Generation failed" });
  }
};
