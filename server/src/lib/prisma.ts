import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
// Načíst .env dřív než DATABASE_URL – prisma se může načíst před index.ts dotenv.config()
import dotenv from "dotenv";
const __dirnamePrisma = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirnamePrisma, "..", "..", ".env") });
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const isPostgres = /^postgres(ql)?:\/\//i.test(connectionString);

/**
 * Resolvuje SQLite cestu na absolutní.
 * Adapter dělá url.replace(/^file:, "") – file:///C:/... dává špatně ///C:/...
 * Proto předáváme čistou absolutní cestu (žádný file: prefix).
 */
function getSqlitePath(url: string): string {
  if (!url.startsWith("file:")) return url;
  let p = url.replace(/^file:\/\//, "").replace(/^file:/, "").replace(/^\/*/, "");
  if (/^[A-Za-z]:[/\\]/.test(p)) return resolve(p); // Windows absolutní
  if (p.startsWith("/")) return p; // Unix absolutní
  const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  return resolve(serverRoot, p.replace(/^\.\//, ""));
}

const sqlitePath = getSqlitePath(connectionString);

if (!isPostgres && connectionString) {
  console.log("[Prisma] SQLite DB path:", sqlitePath);
}

export const prisma = isPostgres
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: sqlitePath }),
    });

// Re-export typů a enumů z generovaného klienta (místo @prisma/client)
export * from "../generated/prisma/client.js";
