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
import { getEmailProvider } from "../lib/email.js";

const router = Router();
const PAIRING_CODE_TTL_MINUTES = 5;
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_DAYS = 60;
const ADMIN_OTP_TTL_MINUTES = 5;
const ADMIN_TOKEN_TTL = "8h";
const ADMIN_OTP_MAX_ATTEMPTS = 5;

function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(0, chars.length)]).join("");
  return `${part(4)}-${part(4)}`;
}

function generateOtpCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, "0");
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
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
 * POST /api/integrations/browser-extension/admin/start
 * Pošle jednorázový kód na e-mail přihlášeného uživatele (odemčení admin nástrojů v rozšíření).
 */
router.post("/admin/start", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId as string;
  const email = (req as any).user.email as string;

  const code = generateOtpCode();
  const codeHash = sha256Hex(code);
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + ADMIN_OTP_TTL_MINUTES);

  await prisma.browserExtensionAdminOtp.create({
    data: {
      userId,
      codeHash,
      expiresAt,
    },
  });

  const emailProvider = getEmailProvider();
  if (!emailProvider) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Extension admin OTP for ${email}: ${code} (expires ${expiresAt.toISOString()})`);
      res.json({ ok: true, expiresAt: expiresAt.toISOString(), delivered: "console" });
      return;
    }
    res.status(500).json({ error: "E-mail služba není nakonfigurovaná (RESEND_API_KEY / RESEND_FROM)." });
    return;
  }

  const subject = "HypoManager – kód pro odemknutí admin nástrojů";
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height:1.5; color:#111; max-width:560px; margin:0 auto;">
  <h2 style="margin: 16px 0 8px;">Kód pro odemknutí admin nástrojů</h2>
  <p>Zadejte tento kód do rozšíření HypoManager Bank Autofill:</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px; background:#f3f4f6; padding: 12px 16px; display:inline-block; border-radius: 10px;">${code}</p>
  <p style="color:#555; font-size: 13px;">Platnost: ${ADMIN_OTP_TTL_MINUTES} minut.</p>
  <p style="color:#888; font-size: 13px; margin-top: 24px;">Pokud jste o kód nežádali, e-mail ignorujte.</p>
</body></html>`.trim();

  await emailProvider.send(email, subject, html);

  res.json({ ok: true, expiresAt: expiresAt.toISOString(), delivered: "email" });
});

/**
 * POST /api/integrations/browser-extension/admin/confirm
 * Ověří kód a vrátí krátkodobý admin token (bez ukládání hesla do rozšíření).
 */
router.post("/admin/confirm", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId as string;
  const email = (req as any).user.email as string;
  const code = String(req.body?.code ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    res.status(400).json({ error: "Kód musí mít 6 číslic." });
    return;
  }

  const otp = await prisma.browserExtensionAdminOtp.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    res.status(400).json({ error: "Kód nenalezen. Nejdřív si vyžádej nový kód." });
    return;
  }
  if (otp.usedAt) {
    res.status(400).json({ error: "Kód už byl použit. Vyžádej si nový." });
    return;
  }
  if (otp.attempts >= ADMIN_OTP_MAX_ATTEMPTS) {
    res.status(429).json({ error: "Příliš mnoho pokusů. Vyžádej si nový kód." });
    return;
  }
  if (new Date() > otp.expiresAt) {
    res.status(400).json({ error: "Kód vypršel. Vyžádej si nový." });
    return;
  }

  const ok = sha256Hex(code) === otp.codeHash;
  await prisma.browserExtensionAdminOtp.update({
    where: { id: otp.id },
    data: ok ? { usedAt: new Date() } : { attempts: { increment: 1 } },
  });

  if (!ok) {
    res.status(400).json({ error: "Nesprávný kód." });
    return;
  }

  const adminToken = jwt.sign(
    { userId, email, typ: "ext_admin", scopes: ["admin:mappings"] },
    getJwtSecret() as jwt.Secret,
    { expiresIn: ADMIN_TOKEN_TTL } as jwt.SignOptions
  );
  const decoded = jwt.decode(adminToken) as { exp?: number };
  const adminTokenExpiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  res.json({ ok: true, adminToken, adminTokenExpiresAt });
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
