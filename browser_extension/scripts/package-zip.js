import fs from "fs";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const outPath = path.join(root, "..", "server", "public", "downloads", "hypomanager-bank-autofill.zip");

if (!fs.existsSync(distDir)) {
  console.error("Missing dist directory. Run `npm run build` first.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const output = fs.createWriteStream(outPath);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`Extension ZIP created: ${outPath} (${archive.pointer()} bytes)`);
});

archive.on("warning", (err) => {
  console.warn(err);
});
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.directory(distDir, "dist");
archive.finalize();

