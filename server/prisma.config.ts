import "dotenv/config";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig, env } from "prisma/config";

// SQLite: vždy absolutní cesta k server/prisma/dev.db – shodné s prisma.ts
function resolveDbUrl(url: string): string {
  if (!url || !url.startsWith("file:")) return url;
  let p = url.replace(/^file:\/\//, "").replace(/^file:/, "").replace(/^\/*/, "");
  if (/^[A-Za-z]:[/\\]/.test(p)) return url;
  const serverRoot = dirname(fileURLToPath(import.meta.url));
  const absolute = resolve(serverRoot, p.replace(/^\.\//, ""));
  return "file:" + absolute;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: resolveDbUrl(env("DATABASE_URL")),
  },
});
