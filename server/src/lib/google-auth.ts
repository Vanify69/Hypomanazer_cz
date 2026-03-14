/**
 * Google OAuth2 – správa tokenů, generování auth URL, exchange code → tokens.
 * Používá google-auth-library (OAuth2Client).
 */
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma.js";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI?.trim() || "";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REDIRECT_URI);
}

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

export function getAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Vrátí OAuth2Client s platnými tokeny pro daného uživatele.
 * Automaticky refreshne access_token pokud vypršel.
 */
export async function getAuthenticatedClient(userId: string): Promise<OAuth2Client | null> {
  const record = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  if (!record) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: record.accessToken,
    refresh_token: record.refreshToken,
    expiry_date: record.expiresAt.getTime(),
  });

  if (record.expiresAt.getTime() <= Date.now() + 60_000) {
    const { credentials } = await client.refreshAccessToken();
    await prisma.googleOAuthToken.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

export async function saveTokens(
  userId: string,
  email: string,
  tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }
): Promise<void> {
  const data = {
    email,
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3600_000),
    scopes: JSON.stringify(SCOPES),
  };

  await prisma.googleOAuthToken.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function revokeTokens(userId: string): Promise<void> {
  const record = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  if (!record) return;

  try {
    const client = createOAuth2Client();
    await client.revokeToken(record.accessToken);
  } catch {
    // Google může vrátit chybu pokud token je už neplatný – ignorujeme
  }

  await prisma.googleOAuthToken.delete({ where: { userId } });
}
