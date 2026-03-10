/**
 * Kopíruje manifest, HTML, CSS a assets do dist po buildu.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

// manifest.json
copyFile(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));

// popup: index.html + popup.css
const popupDist = path.join(dist, "popup");
ensureDir(popupDist);
let popupHtml = fs.readFileSync(path.join(root, "src", "popup", "popup.html"), "utf8");
popupHtml = popupHtml.replace('src="popup.js"', 'src="popup.js"');
fs.writeFileSync(path.join(popupDist, "index.html"), popupHtml);
copyFile(path.join(root, "src", "popup", "popup.css"), path.join(popupDist, "popup.css"));

// options
const optionsDist = path.join(dist, "options");
ensureDir(optionsDist);
const optionsSrc = path.join(root, "src", "options", "index.html");
if (fs.existsSync(optionsSrc)) {
  copyFile(optionsSrc, path.join(optionsDist, "index.html"));
} else {
  fs.writeFileSync(
    path.join(optionsDist, "index.html"),
    `<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8"/><title>Nastavení</title></head><body><h1>Nastavení rozšíření</h1></body></html>`
  );
}

// assets (ikony) – pokud existují
const assetsSrc = path.join(root, "assets");
const assetsDest = path.join(dist, "assets");
if (fs.existsSync(assetsSrc)) {
  ensureDir(assetsDest);
  for (const name of fs.readdirSync(assetsSrc)) {
    copyFile(path.join(assetsSrc, name), path.join(assetsDest, name));
  }
}

console.log("Copy assets done.");
