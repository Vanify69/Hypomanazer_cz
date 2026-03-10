import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: undefined,
    rollupOptions: {
      input: {
        "background/service-worker": resolve(__dirname, "src/background/service-worker.ts"),
        "content/content-script": resolve(__dirname, "src/content/content-script.ts"),
        "popup/popup": resolve(__dirname, "src/popup/popup.ts"),
        "options/options": resolve(__dirname, "src/options/options.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
    sourcemap: true,
    minify: false,
    target: "es2020",
  },
});
