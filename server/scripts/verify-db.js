import "dotenv/config";
import Database from "better-sqlite3";
import { existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = join(__dirname, "..");

console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("Server root:", serverRoot);

const paths = [
  resolve(serverRoot, "prisma", "dev.db"),
  resolve(serverRoot, "dev.db"),
];

for (const p of paths) {
  const rel = p.replace(serverRoot, ".");
  if (!existsSync(p)) {
    console.log(rel, "- NOT FOUND");
    continue;
  }
  try {
    const db = new Database(p, { readonly: true });
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='User'").all();
    console.log(rel, "- User table:", rows.length ? "YES" : "NO");
    db.close();
  } catch (e) {
    console.log(rel, "- error:", e.message);
  }
}
