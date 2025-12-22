import type { Handler } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";
import archiver from "archiver";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { getViteReactBaseFiles } from "../../src/lib/export/viteReactTemplate";
import { getSectionTemplate } from "../../src/lib/export/sectionComponents";
import { renderPage, getPageComponentName, getPagePath } from "../../src/lib/export/renderPage";
import { writeVisualSystem } from "../../src/lib/export/writeVisualSystem";
import { writeSiteMedia } from "../../src/lib/export/writeSiteMedia";
import { generateSiteMedia, type SiteMedia, type SiteMediaAsset } from "../../src/lib/media";
import type { DesignIntent } from "../../src/lib/designIntent";
import type { VisualSystem } from "../../src/lib/visualSystem";
import { requireAuth, requireSiteOwner } from "./auth";

const EXPORT_ROOT = "/tmp/exports";

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

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: jsonHeaders,
  body: JSON.stringify(body),
});

const placeholderJpegBase64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAdEAACAgEFAAAAAAAAAAAAAAABAgADBAUREiEE/8QAFQEBAQAAAAAAAAAAAAAAAAAAAgP/xAAXEQEBAQEAAAAAAAAAAAAAAAABAgAD/9oADAMBAAIRAxEAPwDW3vZr1k8q2Ul1pAH//2Q==";

const ensureDir = async (target: string) => {
  await fs.mkdir(target, { recursive: true });
};

const writeFile = async (root: string, filePath: string, contents: string | Buffer) => {
  const outputPath = path.join(root, filePath);
  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, contents);
};

const zipDirectory = async (source: string, destination: string) =>
  new Promise<void>((resolve, reject) => {
    const output = createWriteStream(destination);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(source, false);
    archive.finalize();
  });

const copyMediaPack = async (projectRoot: string) => {
  const source = path.resolve(process.cwd(), "public", "media", "premium");
  const destination = path.join(projectRoot, "public", "media", "premium");
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, destination, { recursive: true, force: true });
};

const copyUserUploads = async (projectRoot: string, sources: string[]) => {
  const uploadRoot = path.resolve(process.cwd(), "public", "media", "uploads");
  const destinationRoot = path.join(projectRoot, "public", "media", "uploads");
  const uniqueSources = Array.from(new Set(sources));

  await fs.mkdir(destinationRoot, { recursive: true });

  let entries: string[] = [];
  try {
    entries = await fs.readdir(uploadRoot);
  } catch {
    return;
  }

  const filesToCopy = new Set<string>();

  for (const src of uniqueSources) {
    if (!src.startsWith("/media/uploads/")) continue;
    const filename = src.replace("/media/uploads/", "");
    filesToCopy.add(filename);

    const base = filename.split(".")[0]?.split("-")[0];
    if (!base) continue;

    entries.forEach((entry) => {
      if (entry.startsWith(`${base}-`) || entry.startsWith(`${base}.`)) {
        filesToCopy.add(entry);
      }
    });
  }

  for (const filename of filesToCopy) {
    const sourcePath = path.join(uploadRoot, filename);
    const destPath = path.join(destinationRoot, filename);
    try {
      await fs.copyFile(sourcePath, destPath);
    } catch {
      // Skip missing files to keep exports resilient in dev.
    }
  }
};

const defaultIntent: DesignIntent = {
  visualGravity: "balanced",
  motionEnergy: "guided",
  spatialDensity: "neutral",
  emotionalTemperature: "neutral",
  prestigeLevel: "professional",
};

const buildAppFile = (pages: Array<{ pageId: string }>) => {
  const imports = new Set<string>([
    `import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";`,
    `import { visualSystem, fontFamilies } from "./design/visualSystem";`,
  ]);

  const routes = pages
    .map((page) => {
      const componentName = getPageComponentName(page.pageId);
      imports.add(`import ${componentName} from "./pages/${componentName}";`);
      return `        <Route path="${getPagePath(page.pageId)}" element={<${componentName} />} />`;
    })
    .join("\n");

  return `${Array.from(imports).join("\n")}

const buildBackground = () => {
  if (visualSystem.color.gradient) {
    return \`linear-gradient(\${visualSystem.color.gradient.angle}deg, \${visualSystem.color.gradient.from}, \${visualSystem.color.gradient.to})\`;
  }
  return visualSystem.color.background;
};

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          minHeight: "100vh",
          background: buildBackground(),
          color: visualSystem.color.primary,
          fontFamily: fontFamilies.body
        }}
      >
        <Routes>
${routes}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
`;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  let body: { siteId?: string; target?: string } = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const siteId = typeof body.siteId === "string" ? body.siteId.trim() : "";
  if (!siteId) {
    return jsonResponse(400, { error: "siteId is required" });
  }

  const auth = requireAuth(event);
  if (!auth.ok) return jsonResponse(auth.statusCode, { error: auth.error });

  const siteAccess = await requireSiteOwner(prisma, siteId, auth.session.userId);
  if (!siteAccess.ok) return jsonResponse(siteAccess.statusCode, { error: siteAccess.error });

  const target = body.target === "vite-react" || !body.target ? "vite-react" : null;
  if (!target) {
    return jsonResponse(400, { error: "Unsupported export target" });
  }

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      pages: {
        orderBy: { position: "asc" },
        include: { sections: { orderBy: { position: "asc" } } },
      },
      mediaAssets: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!site) {
    return jsonResponse(404, { error: "Site not found" });
  }

  if (site.state !== "ready") {
    return jsonResponse(409, { error: "Site is not ready for export" });
  }

  if (!site.visualSystem || typeof site.visualSystem !== "object") {
    return jsonResponse(409, { error: "Visual system is missing" });
  }

  const visualSystem = site.visualSystem as VisualSystem;
  const designIntent = (site.designIntent as DesignIntent) ?? defaultIntent;
  const baseMedia =
    site.media && typeof site.media === "object" ? (site.media as SiteMedia) : generateSiteMedia(designIntent);
  const userMedia: SiteMediaAsset[] = site.mediaAssets.map((asset) => ({
    id: asset.id,
    role: asset.role as SiteMediaAsset["role"],
    kind: asset.kind as SiteMediaAsset["kind"],
    src: asset.src,
    poster: asset.poster ?? undefined,
    alt: asset.alt ?? undefined,
    caption: asset.caption ?? undefined,
    status: asset.status as SiteMediaAsset["status"],
  }));
  const overriddenRoles = new Set(userMedia.map((asset) => asset.role));
  const siteMedia: SiteMedia = {
    assets: [...userMedia, ...baseMedia.assets.filter((asset) => !overriddenRoles.has(asset.role))],
  };

  const exportRoot = path.join(EXPORT_ROOT, siteId);
  const projectRoot = path.join(exportRoot, target);
  const zipPath = path.join(EXPORT_ROOT, `${siteId}.zip`);

  await fs.rm(exportRoot, { recursive: true, force: true });
  await ensureDir(projectRoot);

  const baseFiles = getViteReactBaseFiles();
  for (const [filePath, contents] of Object.entries(baseFiles)) {
    await writeFile(projectRoot, filePath, contents);
  }

  await writeFile(projectRoot, "src/design/visualSystem.ts", writeVisualSystem(visualSystem));
  await writeFile(projectRoot, "src/design/siteMedia.ts", writeSiteMedia(siteMedia));
  await writeFile(projectRoot, "design-intent.json", JSON.stringify(site.designIntent ?? {}, null, 2));

  const sectionIds = new Set<string>();
  for (const page of site.pages) {
    for (const section of page.sections) {
      sectionIds.add(section.sectionId);
    }
  }

  for (const sectionId of sectionIds) {
    const template = getSectionTemplate(sectionId);
    if (!template) {
      return jsonResponse(400, { error: `Missing section renderer for ${sectionId}` });
    }
    await writeFile(projectRoot, `src/sections/${template.componentName}.tsx`, template.code);
  }

  for (const page of site.pages) {
    const pageContent = renderPage({
      pageId: page.pageId,
      sections: page.sections.map((section) => ({
        sectionId: section.sectionId,
        content: section.content ?? {},
      })),
    });
    const pageName = getPageComponentName(page.pageId);
    await writeFile(projectRoot, `src/pages/${pageName}.tsx`, pageContent);
  }

  const appFile = buildAppFile(site.pages.map((page) => ({ pageId: page.pageId })));
  await writeFile(projectRoot, "src/App.tsx", appFile);

  const placeholderBuffer = Buffer.from(placeholderJpegBase64, "base64");
  await writeFile(projectRoot, "public/media/placeholder-hero.jpg", placeholderBuffer);
  await copyMediaPack(projectRoot);
  await copyUserUploads(projectRoot, site.mediaAssets.map((asset) => asset.src));

  await zipDirectory(projectRoot, zipPath);

  return jsonResponse(200, {
    exportId: siteId,
    downloadUrl: `/api/exports/${siteId}.zip`,
    target,
  });
};
