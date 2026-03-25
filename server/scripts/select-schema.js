#!/usr/bin/env node
/**
 * Vybere schema.prisma podle DATABASE_URL nebo DB_PROVIDER:
 * - postgresql:// → schema.postgresql.prisma (produkce)
 * - file: nebo nic / sqlite → schema.sqlite.prisma (lokál)
 * Použití: node scripts/select-schema.js (před prisma generate)
 */
import { copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });
const prismaDir = join(root, "prisma");

const url = process.env.DATABASE_URL || "";
const provider = process.env.DB_PROVIDER || "";

const usePostgres =
  provider === "postgresql" || /^postgres(ql)?:\/\//i.test(url);

const source = usePostgres
  ? "schema.postgresql.prisma"
  : "schema.sqlite.prisma";
const srcPath = join(prismaDir, source);
const destPath = join(prismaDir, "schema.prisma");

if (!existsSync(srcPath)) {
  console.error(`Chybí soubor: ${srcPath}`);
  process.exit(1);
}

copyFileSync(srcPath, destPath);
console.log(`Schema: ${source} → schema.prisma (${usePostgres ? "PostgreSQL" : "SQLite"})`);
