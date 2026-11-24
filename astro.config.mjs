import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://raphaelbezerrajor.github.io",
  base: "/radar-diarios-goias",
  output: "static",
  // A prévia da redação permite scripts do próprio site em arquivos separados.
  vite: { build: { assetsInlineLimit: 0 } }
});
