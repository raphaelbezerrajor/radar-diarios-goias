import { defineConfig } from "astro/config";
import { readFile, unlink } from "node:fs/promises";

// Astro copies public/ wholesale. Remove page scans used exclusively by
// private pitches from the deployment, keeping the newsroom originals.
const privateScans = {
  name: "pauteiro-private-source-pages",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const records = JSON.parse(await readFile("src/generated/site-records.json", "utf8"));
      const published = new Set(records.filter(r => !r.reportingCandidate).map(r => r.image?.src));
      const withheld = new Set(records.filter(r => r.reportingCandidate && r.image?.kind === "source-page").map(r => r.image.src));
      for (const src of withheld) {
        if (published.has(src)) continue;
        if (!/^\/assets\/sources\/(?:[\w-]+\/)*[\w.-]+\.webp$/i.test(src)) throw Error("Caminho de reprodução inesperado: " + src);
        await unlink(new URL(src.slice(1), dir)).catch(error => { if (error.code !== "ENOENT") throw error; });
      }
    }
  }
};

export default defineConfig({
  site: "https://raphaelbezerrajor.github.io",
  base: "/radar-diarios-goias",
  output: "static",
  integrations: [privateScans],
  // A prévia da redação permite scripts do próprio site em arquivos separados.
  vite: { build: { assetsInlineLimit: 0 } }
});
