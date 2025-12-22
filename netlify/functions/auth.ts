import crypto from "node:crypto";

type AuthSession = {
  userId: string;
  email?: string;
  role?: string;
};

type AuthResult =
  | { ok: true; session: AuthSession | null }
  | { ok: false; statusCode: number; error: string };

const getJwtSecret = () => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error("Server auth is not configured");
  }
  return secret;
};

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
};

const encodeBase64Url = (value: Buffer) =>
  value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getBearerToken = (event: { headers?: Record<string, string | undefined> }) => {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (!type || !token || type.toLowerCase() !== "bearer") return "";
  return token.trim();
};

const verifyJwt = (token: string) => {
  const secret = getJwtSecret();
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerPart, payloadPart, signaturePart] = parts;
  let header: { alg?: string } | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    header = JSON.parse(decodeBase64Url(headerPart));
    payload = JSON.parse(decodeBase64Url(payloadPart));
  } catch {
    return null;
  }

  if (header?.alg !== "HS256") return null;

  const signatureBase = `${headerPart}.${payloadPart}`;
  const expected = encodeBase64Url(crypto.createHmac("sha256", secret).update(signatureBase).digest());
  const sigBuffer = Buffer.from(signaturePart);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (exp && Date.now() / 1000 >= exp) return null;

  const userId = typeof payload?.sub === "string" ? payload.sub : "";
  if (!userId) return null;

  return {
    userId,
    email: typeof payload?.email === "string" ? payload.email : undefined,
    role: typeof payload?.role === "string" ? payload.role : undefined,
  } as AuthSession;
};

export const getOptionalAuth = (event: { headers?: Record<string, string | undefined> }): AuthResult => {
  let token: string | null = null;
  try {
    token = getBearerToken(event);
  } catch {
    return { ok: false, statusCode: 401, error: "unauthenticated" };
  }

  if (!token) return { ok: true, session: null };
  if (token === "") return { ok: false, statusCode: 401, error: "unauthenticated" };

  try {
    const session = verifyJwt(token);
    if (!session) return { ok: false, statusCode: 401, error: "unauthenticated" };
    return { ok: true, session };
  } catch (error: any) {
    return {
      ok: false,
      statusCode: 500,
      error: error?.message || "Server auth is not configured",
    };
  }
};

export const requireAuth = (event: { headers?: Record<string, string | undefined> }) => {
  if (!process.env.SUPABASE_JWT_SECRET) {
    return { ok: false, statusCode: 500, error: "Server auth is not configured" } as const;
  }
  const result = getOptionalAuth(event);
  if (!result.ok) return result;
  if (!result.session) return { ok: false, statusCode: 401, error: "unauthenticated" } as const;
  return { ok: true, session: result.session } as const;
};

export const requireSiteOwner = async (
  prisma: {
    site: {
      findUnique: (args: { where: { id: string }; select: { id: true; ownerId: true } }) => Promise<{ id: string; ownerId: string | null } | null>;
      update: (args: { where: { id: string }; data: { ownerId: string } }) => Promise<unknown>;
    };
  },
  siteId: string,
  userId: string,
  options: { allowClaim?: boolean } = {},
) => {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, ownerId: true },
  });

  if (!site) {
    return { ok: false, statusCode: 404, error: "Site not found" } as const;
  }

  if (!site.ownerId) {
    if (options.allowClaim) {
      await prisma.site.update({
        where: { id: siteId },
        data: { ownerId: userId },
      });
      return { ok: true, ownerId: userId } as const;
    }
    return { ok: false, statusCode: 403, error: "unauthorized" } as const;
  }

  if (site.ownerId !== userId) {
    return { ok: false, statusCode: 403, error: "unauthorized" } as const;
  }

  return { ok: true, ownerId: site.ownerId } as const;
};
