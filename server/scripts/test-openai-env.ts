/**
 * Test načtení .env a platnosti OPENAI_API_KEY.
 * Spusť ze složky server: npx tsx scripts/test-openai-env.ts
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

console.log("--- Test OPENAI_API_KEY ---");
console.log("Cesta k .env:", envPath);

if (fs.existsSync(envPath)) {
  const rawContent = fs.readFileSync(envPath, "utf8");
  const line = rawContent.split(/\r?\n/).find((l) => /^OPENAI_API_KEY\s*=/.test(l));
  if (line != null) {
    const afterEq = line.replace(/^OPENAI_API_KEY\s*=\s*/, "").replace(/^["']|["']$/g, "");
    console.log("Řádek v .env (délka za =):", afterEq.length, "| prvních 15 znaků:", afterEq.slice(0, 15) || "(prázdné)");
    if (afterEq.length === 0) {
      console.log("\n!! Na disku je za OPENAI_API_KEY= prázdno. Ulož soubor server/.env (Ctrl+S) a spusť test znovu.");
    }
  } else {
    console.log("V .env nebyl nalezen řádek OPENAI_API_KEY=...");
  }
}

console.log("Před načtením .env - OPENAI_API_KEY už v procesu?", process.env.OPENAI_API_KEY !== undefined ? "ano (délka " + (process.env.OPENAI_API_KEY?.length ?? 0) + ")" : "ne");

const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  console.error("Chyba načtení .env:", result.error.message);
  process.exit(1);
}
console.log("Po načtení .env - parsed:", result.parsed ? Object.keys(result.parsed) : "null");

const raw = process.env.OPENAI_API_KEY;
const key = (raw ?? "").trim();

console.log("OPENAI_API_KEY po načtení:");
console.log("  - existuje (process.env):", raw !== undefined);
console.log("  - délka RAW (před trim):", raw?.length ?? 0);
console.log("  - délka (po trim):", key.length);
console.log("  - prefix (první 12 znaků):", key ? key.slice(0, 12) + "..." : "(prázdné)");
console.log("  - obsahuje mezeru na začátku/konci:", raw !== undefined && (raw !== raw?.trim()));
if (raw != null && raw.length > 0 && raw.length <= 200) {
  console.log("  - RAW (hex prvních 20 znaků):", [...raw.slice(0, 20)].map((c) => c.charCodeAt(0).toString(16)).join(" "));
}

if (!key) {
  console.error("\nKlíč je prázdný. Zkontroluj, že v server/.env je řádek OPENAI_API_KEY=sk-proj-... a že za = je celý klíč.");
  process.exit(1);
}

console.log("\nKontrola platnosti klíče (volání OpenAI API)...");
const base = (process.env.OPENAI_API_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
const finalUrl = base.includes("chat/completions") ? base : base + "/chat/completions";

try {
  const res = await fetch(finalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: "Řekni jen: OK" }],
      max_tokens: 5,
    }),
  });

  const text = await res.text();
  console.log("HTTP status:", res.status);
  if (!res.ok) {
    console.error("Odpověď API:", text.slice(0, 500));
    process.exit(1);
  }
  console.log("Odpověď (zkráceno):", text.slice(0, 200));
  console.log("\nKlíč funguje. Server by měl LLM extrakci používat.");
} catch (err) {
  console.error("Chyba volání API:", err);
  process.exit(1);
}
