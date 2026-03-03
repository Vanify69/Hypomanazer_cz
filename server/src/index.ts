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
import { ensureUploadDir } from "./lib/upload.js";
import { publicApiLimiter } from "./lib/rateLimit.js";

const PORT = process.env.PORT ?? 4000;

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

// Statické soubory pro nahrané dokumenty (volitelně – lze servírovat přes endpoint)
const uploadDir = process.env.UPLOAD_DIR ?? path.join(__dirname, "..", "uploads");
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "hypomanager-api",
    llmAvailable: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
});

app.listen(PORT, () => {
  console.log(`HypoManažer API běží na http://localhost:${PORT}`);
});
