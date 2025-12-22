import crypto from "node:crypto";

const getSecret = () => {
  const secret = process.env.DEPLOY_TOKEN_SECRET || process.env.NETLIFY_CLIENT_SECRET || "";
  if (!secret) {
    throw new Error("DEPLOY_TOKEN_SECRET is not configured");
  }
  return secret;
};

const toBase64Url = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
};

export type DeployStatePayload = {
  siteId: string;
  userId: string;
  ts: number;
  returnTo?: string;
};

export const signState = (payload: DeployStatePayload) => {
  const secret = getSecret();
  const data = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = toBase64Url(crypto.createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
};

export const verifyState = (state: string, maxAgeMs = 10 * 60 * 1000) => {
  const secret = getSecret();
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;

  const expected = toBase64Url(crypto.createHmac("sha256", secret).update(data).digest());
  const sigBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  let payload: DeployStatePayload;
  try {
    payload = JSON.parse(fromBase64Url(data).toString("utf8")) as DeployStatePayload;
  } catch {
    return null;
  }

  if (!payload?.siteId || !payload?.userId || !payload?.ts) return null;
  if (Date.now() - payload.ts > maxAgeMs) return null;

  return payload;
};

export const encryptToken = (token: string) => {
  const secret = getSecret();
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return toBase64Url(Buffer.concat([iv, tag, encrypted]));
};

export const decryptToken = (payload: string) => {
  const secret = getSecret();
  const key = crypto.createHash("sha256").update(secret).digest();
  const data = fromBase64Url(payload);
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
};
