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

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
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
    JWT_SECRET as jwt.Secret,
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
    JWT_SECRET as jwt.Secret,
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

export { router as browserExtensionRouter };
