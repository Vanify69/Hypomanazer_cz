import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config();

import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { casesRouter } from "./routes/cases.js";
import { leadsRouter } from "./routes/leads.js";
import { intakeRouter } from "./routes/intake.js";
import { referrersRouter } from "./routes/referrers.js";
import { refRouter } from "./routes/ref.js";
import { browserExtensionRouter } from "./routes/browserExtension.js";
import { ensureUploadDir } from "./lib/upload.js";
import { publicApiLimiter } from "./lib/rateLimit.js";

const PORT = process.env.PORT ?? 4000;
// Na Railway (a v produkci) musí server naslouchat na 0.0.0.0, jinak proxy se nedostane k aplikaci
const HOST = process.env.HOST ?? "0.0.0.0";

ensureUploadDir();

const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
console.log(hasOpenAiKey ? "[Start] OPENAI_API_KEY je nastaven (LLM extrakce zapnuta)" : "[Start] OPENAI_API_KEY chybí – extrakce z OP jen přes regex");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/cases", casesRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/intake", publicApiLimiter, intakeRouter);
app.use("/api/referrers", referrersRouter);
app.use("/api/ref", publicApiLimiter, refRouter);
app.use("/api/integrations/browser-extension", browserExtensionRouter);

// Statické soubory pro nahrané dokumenty (volitelně – lze servírovat přes endpoint)
const uploadDir = process.env.UPLOAD_DIR ?? path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadDir));

// Testovací stránka pro rozšíření (vyplňování formulářů)
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "hypomanager-api",
    llmAvailable: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
});

// Globální handler chyb – aby 500 vracelo JSON a zprávu pro klienta
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API] Nezachycená chyba:", err);
  const message = err instanceof Error ? err.message : "Došlo k chybě serveru.";
  res.status(500).json({ error: message });
});

app.listen(Number(PORT), HOST, () => {
  console.log(`HypoManažer API běží na http://${HOST}:${PORT}`);
});
