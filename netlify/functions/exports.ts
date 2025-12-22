import type { Handler } from "@netlify/functions";
import fs from "node:fs/promises";
import path from "node:path";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET, OPTIONS",
};

const fileHeaders = {
  "content-type": "application/zip",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
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
