/**
 * Google OAuth + Calendar sync endpoints.
 * Prefix: /api/integrations/google
 */
import { Router } from "express";
import { google } from "googleapis";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  isGoogleConfigured,
  getAuthUrl,
  exchangeCodeForTokens,
  createOAuth2Client,
  saveTokens,
  revokeTokens,
} from "../lib/google-auth.js";
import {
  syncAllEventsToGoogle,
  pullEventsFromGoogle,
  pushEventToGoogle,
} from "../lib/google-calendar.js";

const router = Router();

// GET /connect — vrátí OAuth URL pro popup flow
router.get("/connect", requireAuth, (_req, res) => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ error: "Google OAuth není nakonfigurován. Nastavte GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET a GOOGLE_REDIRECT_URI." });
    return;
  }
  const userId = (_req as any).user.userId;
  const url = getAuthUrl(userId);
  res.json({ url });
});

// GET /callback — Exchange code, toto se volá z popup okna (redirect URI).
// Podporuje dva režimy:
//   1) Redirect z Google (query: code + state=userId) – odpovídá HTML pro zavření popup
//   2) POST z frontendu s { code } v body (viz alternativní endpoint níže)
router.get("/callback", async (req, res) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) {
    res.status(400).send(closePopupHtml("Připojení zamítnuto."));
    return;
  }

  if (!code || !state) {
    res.status(400).send(closePopupHtml("Chybí parametry."));
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    // Získat email uživatele z Google
    const client = createOAuth2Client();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    const email = data.email ?? "unknown";

    await saveTokens(state, email, tokens);

    res.send(closePopupHtml("Google účet úspěšně připojen!", true));
  } catch (err) {
    console.error("[Google] OAuth callback error:", err);
    res.status(500).send(closePopupHtml("Chyba při připojování Google účtu."));
  }
});

// POST /callback — alternativní endpoint pro frontend flow (předá code v body)
router.post("/callback", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "Chybí authorization code." });
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    const client = createOAuth2Client();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    const email = data.email ?? "unknown";

    await saveTokens(userId, email, tokens);
    res.json({ ok: true, email });
  } catch (err) {
    console.error("[Google] OAuth POST callback error:", err);
    res.status(500).json({ error: "Nepodařilo se připojit Google účet." });
  }
});

// GET /status — stav připojení
router.get("/status", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const record = await prisma.googleOAuthToken.findUnique({
    where: { userId },
    select: { email: true, scopes: true, createdAt: true },
  });

  if (!record) {
    res.json({ connected: false });
    return;
  }

  res.json({
    connected: true,
    email: record.email,
    scopes: JSON.parse(record.scopes),
    connectedAt: record.createdAt,
  });
});

// DELETE /disconnect — odpojení Google účtu
router.delete("/disconnect", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  await revokeTokens(userId);

  // Vyčistit googleEventId z událostí (odpojujeme, ale lokální data zůstanou)
  await prisma.calendarEvent.updateMany({
    where: { userId },
    data: { googleEventId: null, googleCalendarId: null, lastSyncedAt: null },
  });

  res.json({ ok: true });
});

// POST /calendar/sync — hromadná synchronizace obou směrů
router.post("/calendar/sync", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;

  const record = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  if (!record) {
    res.status(400).json({ error: "Google účet není připojen." });
    return;
  }

  try {
    const pulled = await pullEventsFromGoogle(userId);
    const pushed = await syncAllEventsToGoogle(userId);
    res.json({ ok: true, pulled, pushed });
  } catch (err: any) {
    console.error("[Google] Calendar sync error:", err);
    res.status(500).json({ error: "Synchronizace selhala: " + (err.message ?? "Neznámá chyba") });
  }
});

// POST /calendar/sync/:eventId — synchronizace jedné události
router.post("/calendar/sync/:eventId", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;

  const record = await prisma.googleOAuthToken.findUnique({ where: { userId } });
  if (!record) {
    res.status(400).json({ error: "Google účet není připojen." });
    return;
  }

  try {
    const googleEventId = await pushEventToGoogle(userId, req.params.eventId);
    res.json({ ok: true, googleEventId });
  } catch (err: any) {
    console.error("[Google] Event sync error:", err);
    res.status(500).json({ error: "Synchronizace události selhala." });
  }
});

// --- Helpers ---

function closePopupHtml(message: string, success = false): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Google připojení</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <p style="font-size:1.25rem;color:${success ? "#16a34a" : "#dc2626"}">${message}</p>
    <p style="color:#666;">Toto okno se automaticky zavře…</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'google-oauth-${success ? "success" : "error"}' }, '*');
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body></html>`;
}

export { router as googleIntegrationRouter };
