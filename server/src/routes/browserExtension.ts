/**
 * API pro integraci rozšíření pro prohlížeč (pairing, refresh token, fill-model).
 * Dle browser_extension.md – bezpečné spárování bez čtení JWT z localStorage.
 */
import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { hashToken, generateToken, verifyToken } from "../lib/tokens.js";
import { getJwtSecret } from "../lib/env.js";

const router = Router();
const PAIRING_CODE_TTL_MINUTES = 5;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_DAYS = 60;

function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(0, chars.length)]).join("");
  return `${part(4)}-${part(4)}`;
}

/** POST /api/integrations/browser-extension/pairing/start – vygeneruje pairing kód (vyžaduje přihlášení v HM) */
router.post("/pairing/start", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const userCode = generateUserCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + PAIRING_CODE_TTL_MINUTES);

  await prisma.browserExtensionPairing.create({
    data: {
      userId,
      userCode,
      expiresAt,
    },
  });

  res.json({
    pairingId: undefined,
    userCode,
    expiresAt: expiresAt.toISOString(),
  });
});

/** POST /api/integrations/browser-extension/pairing/confirm – výměna kódu za tokeny (bez auth) */
router.post("/pairing/confirm", async (req, res) => {
  const body = req.body as {
    userCode?: string;
    installationId?: string;
    device?: { name?: string };
  };
  const userCode = String(body?.userCode ?? "").trim().toUpperCase().replace(/\s/g, "");
  const installationId = String(body?.installationId ?? "").trim();

  if (!userCode || !installationId) {
    res.status(400).json({ error: "userCode a installationId jsou povinné." });
    return;
  }

  const pairing = await prisma.browserExtensionPairing.findUnique({
    where: { userCode },
    include: { user: true },
  });

  if (!pairing) {
    res.status(400).json({ error: "Neplatný nebo vypršený kód." });
    return;
  }
  if (pairing.usedAt) {
    res.status(400).json({ error: "Kód byl již použit." });
    return;
  }
  if (new Date() > pairing.expiresAt) {
    res.status(400).json({ error: "Kód vypršel." });
    return;
  }

  await prisma.browserExtensionPairing.update({
    where: { id: pairing.id },
    data: { usedAt: new Date() },
  });

  const refreshToken = generateToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAtDevice = new Date();
  expiresAtDevice.setDate(expiresAtDevice.getDate() + REFRESH_TOKEN_DAYS);

  await prisma.browserExtensionDevice.upsert({
    where: { installationId },
    create: {
      userId: pairing.userId,
      installationId,
      refreshTokenHash,
      expiresAt: expiresAtDevice,
    },
    update: {
      refreshTokenHash,
      expiresAt: expiresAtDevice,
    },
  });

  const accessToken = jwt.sign(
    { userId: pairing.user.id, email: pairing.user.email },
    getJwtSecret() as jwt.Secret,
    { expiresIn: ACCESS_TOKEN_TTL } as jwt.SignOptions
  );
  const decoded = jwt.decode(accessToken) as { exp?: number };
  const accessTokenExpiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 15 * 60 * 1000).toISOString();

  res.json({
    refreshToken,
    accessToken,
    accessTokenExpiresAt,
    scopes: ["cases:read", "fill:read"],
    deviceRegisteredAt: new Date().toISOString(),
  });
});

/** POST /api/integrations/browser-extension/token/refresh */
router.post("/token/refresh", async (req, res) => {
  const refreshToken = (req.body?.refreshToken ?? "").trim();
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken je povinný." });
    return;
  }

  const devices = await prisma.browserExtensionDevice.findMany();
  const deviceFound = devices.find((d) => verifyToken(refreshToken, d.refreshTokenHash));
  if (!deviceFound) {
    res.status(401).json({ error: "Neplatný nebo odvolaný refresh token." });
    return;
  }
  if (new Date() > deviceFound.expiresAt) {
    res.status(401).json({ error: "Refresh token vypršel." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: deviceFound.userId },
    select: { id: true, email: true },
  });
  if (!user) {
    res.status(401).json({ error: "Uživatel nenalezen." });
    return;
  }

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    getJwtSecret() as jwt.Secret,
    { expiresIn: ACCESS_TOKEN_TTL } as jwt.SignOptions
  );
  const decoded = jwt.decode(accessToken) as { exp?: number };
  const accessTokenExpiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 15 * 60 * 1000).toISOString();

  res.json({
    accessToken,
    accessTokenExpiresAt,
  });
});

/**
 * POST /api/integrations/browser-extension/mappings
 * Uloží nebo aktualizuje mapping pack pro daného uživatele a stránku (hostname + pathPrefix).
 * Používá se z rozšíření nebo z HM UI (vyžaduje Bearer token = requireAuth).
 */
router.post("/mappings", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId as string;
  const body = req.body as any;

  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Chybí tělo požadavku." });
    return;
  }

  const bankId = String(body.bankId ?? "").trim() || "bank";
  const hostnames = Array.isArray(body.match?.hostnames) ? body.match.hostnames : [];
  const pathIncludes = Array.isArray(body.match?.pathIncludes) ? body.match.pathIncludes : [];

  const hostnameRaw = (hostnames[0] ?? "").toString().toLowerCase().trim();
  const hostname = hostnameRaw.replace(/^www\./, "");
  const pathPrefix = (pathIncludes[0] ?? "/").toString().trim() || "/";

  if (!hostname) {
    res.status(400).json({ error: "match.hostnames[0] je povinné." });
    return;
  }

  const packJson = JSON.stringify(body);

  const mapping = await prisma.browserExtensionMapping.upsert({
    where: {
      userId_hostname_pathPrefix: {
        userId,
        hostname,
        pathPrefix,
      },
    },
    create: {
      userId,
      bankId,
      hostname,
      pathPrefix,
      packJson,
    },
    update: {
      bankId,
      packJson,
    },
  });

  res.json({
    ok: true,
    id: mapping.id,
    bankId: mapping.bankId,
    hostname: mapping.hostname,
    pathPrefix: mapping.pathPrefix,
    updatedAt: mapping.updatedAt.toISOString(),
  });
});

/**
 * GET /api/integrations/browser-extension/mappings?hostname=&pathname=
 * Vrátí nejvhodnější mapping pack pro aktuální URL (podle hostname + pathname, specifický pathPrefix vyhrává).
 */
router.get("/mappings", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId as string;
  const hostnameQuery = String(req.query.hostname ?? "").toLowerCase().trim();
  const pathnameQuery = String(req.query.pathname ?? "").trim() || "/";

  if (!hostnameQuery) {
    res.status(400).json({ error: "hostname je povinný query parametr." });
    return;
  }

  const hostname = hostnameQuery.replace(/^www\./, "");
  const mappings = await prisma.browserExtensionMapping.findMany({
    where: { userId, hostname },
    orderBy: { updatedAt: "desc" },
  });

  if (!mappings.length) {
    res.status(404).json({ error: "Pro tuto stránku není uložen žádný mapping." });
    return;
  }

  const pathnameLower = pathnameQuery.toLowerCase();
  let best: typeof mappings[number] | null = null;

  for (const m of mappings) {
    const prefix = m.pathPrefix?.toLowerCase() ?? "/";
    if (!pathnameLower.includes(prefix)) continue;
    if (!best) {
      best = m;
      continue;
    }
    if ((prefix.length > (best.pathPrefix?.length ?? 0))) {
      best = m;
    }
  }

  if (!best) {
    res.status(404).json({ error: "Pro tuto stránku není vhodný mapping." });
    return;
  }

  try {
    const pack = JSON.parse(best.packJson);
    res.json(pack);
  } catch {
    res.status(500).json({ error: "Mapping je poškozený (nelze parsovat JSON)." });
  }
});

export { router as browserExtensionRouter };
