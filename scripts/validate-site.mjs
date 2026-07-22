import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();
const readJson = async (...parts) => JSON.parse(await readFile(path.join(root, ...parts), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const summary = await readJson("public", "data", "site-summary.json");
const manifest = await readJson("public", "data", "site-search-manifest.json");
const search = await readJson("public", "data", "site-search.json");
const defaultShard = await readFile(path.join(root, "public", "data", "search", `year-${manifest.defaultYear}.json`));
const home = await readFile(path.join(root, "dist", "index.html"), "utf8");
const trindade = await readFile(path.join(root, "dist", "trindade", "index.html"), "utf8");
const searchPage = await readFile(path.join(root, "dist", "busca", "index.html"), "utf8");
const ids = new Set(search.records.map((record) => record.id));
const trindadeCount = search.records.filter((record) => record.city === "Trindade").length;

assert(search.total === search.records.length, "Contagem total da busca diverge dos registros.");
assert(manifest.total === search.total, "Manifesto e base completa divergem.");
assert(ids.size === search.records.length, "A busca contém identificadores duplicados.");
assert(trindadeCount === 4621, `A integração de Trindade deveria ter 4.621 registros; recebeu ${trindadeCount}.`);
assert(summary.metrics.records === search.total, "Resumo do site e base de busca divergem.");
assert(summary.metrics.trindadeActs === 2919, "A base deveria preservar os 2.919 atos estruturados.");
assert(gzipSync(defaultShard).byteLength < 500_000, "O recorte anual padrão ficou pesado demais para celular.");
assert(home.includes("PAINEL DIÁRIO"), "A identidade principal não aparece na capa.");
assert(home.includes("O poder público, documento por documento."), "A proposta principal não aparece na capa.");
assert(trindade.includes("oito anos"), "A página de Trindade não explica o horizonte de cobertura.");
assert(searchPage.includes("data-search-root"), "A busca pública não foi renderizada.");
assert((await stat(path.join(root, "dist", "index.html"))).size < 90_000, "A capa HTML ultrapassou o limite de peso.");

console.log(JSON.stringify({
  records: search.total,
  trindade: trindadeCount,
  acts: summary.metrics.trindadeActs,
  citiesLoaded: summary.metrics.loadedCities,
  defaultYear: manifest.defaultYear,
  defaultShardBytes: defaultShard.byteLength,
  defaultShardGzipBytes: gzipSync(defaultShard).byteLength,
  status: "ok"
}, null, 2));
