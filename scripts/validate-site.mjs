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
const platform = await readFile(path.join(root, "dist", "pauteiro", "index.html"), "utf8");
const trindade = await readFile(path.join(root, "dist", "trindade", "index.html"), "utf8");
const timeline = await readFile(path.join(root, "dist", "linha-do-tempo", "index.html"), "utf8");
const searchPage = await readFile(path.join(root, "dist", "busca", "index.html"), "utf8");
const checkedStory = await readFile(path.join(root, "dist", "base", "trindade-noticia-shows-festival-gastronomico-2026", "index.html"), "utf8");
const checkedActNews = await readFile(path.join(root, "dist", "base", "trindade-ato-agm-106613-e4566c23-ccf266959c8d", "index.html"), "utf8");
const ids = new Set(search.records.map((record) => record.id));
const trindadeCount = search.records.filter((record) => record.city === "Trindade").length;

assert(search.total === search.records.length, "Contagem total da busca diverge dos registros.");
assert(manifest.total === search.total, "Manifesto e base completa divergem.");
assert(ids.size === search.records.length, "A busca contém identificadores duplicados.");
assert(trindadeCount === 5064, `A integração de Trindade deveria ter 5.064 registros; recebeu ${trindadeCount}.`);
assert(summary.metrics.records === search.total, "Resumo do site e base de busca divergem.");
assert(summary.metrics.trindadeActs === 2919, "A base deveria preservar os 2.919 atos estruturados.");
assert(gzipSync(defaultShard).byteLength < 500_000, "O recorte anual padrão ficou pesado demais para celular.");
assert(home.includes("PAUTEIRO"), "A identidade principal não aparece na capa.");
assert(home.includes("Notícia pública, documento por documento."), "A proposta jornalística não aparece na capa.");
assert(platform.includes("Plataforma editorial modular"), "A página da plataforma não foi renderizada.");
assert(platform.includes("Publicação") && platform.includes("Matérias documentais verificadas entram diariamente"), "A publicação documental não aparece como ativa.");
assert(trindade.includes("oito anos"), "A página de Trindade não explica o horizonte de cobertura.");
assert(trindade.includes("Tudo de Trindade, organizado por área"), "Os módulos municipais de Trindade não aparecem.");
assert(timeline.includes("Linha do tempo") && timeline.includes("somente fatos de 2026"), "A linha do tempo corrente não foi separada do arquivo histórico.");
assert(searchPage.includes("data-search-root"), "A busca pública não foi renderizada.");
assert(checkedStory.includes("Notícia documental") && checkedStory.includes("Publicado pelo Pauteiro"), "O acervo já publicado não recebeu a apresentação jornalística.");
assert(checkedStory.includes('"@type":"NewsArticle"') && checkedStory.includes('"@type":"BreadcrumbList"'), "Os schemas editoriais não foram renderizados.");
assert(checkedStory.includes("Crédito: Trindade Aberta"), "O crédito da imagem não aparece na matéria checada.");
assert(checkedStory.match(/Dois extratos de contratos artísticos publicados pelo Município/g)?.length === 1, "A matéria checada repete o resumo no corpo.");
assert(checkedActNews.includes("Matéria baseada em documento oficial"), "O ato não recebeu a apresentação jornalística documental.");
assert(checkedActNews.includes("Estado editorial: publicada"), "O ato não foi marcado como matéria publicada.");
assert(checkedActNews.includes("Prefeitura Municipal de Trindade publicou PORTARIA Nº 060/2025-GAB"), "O lead documental do ato não aparece no corpo.");
assert(checkedActNews.includes("A matéria consta na edição 3411, na página 85"), "O detalhamento documental do ato não aparece no corpo.");
assert(!checkedActNews.includes('class="detail-summary"'), "O lead documental do ato está repetido no corpo.");
assert((await stat(path.join(root, "dist", "index.html"))).size < 90_000, "A capa HTML ultrapassou o limite de peso.");

console.log(JSON.stringify({
  records: search.total,
  trindade: trindadeCount,
  acts: summary.metrics.trindadeActs,
  currentYearStories: summary.metrics.currentYearStories,
  citiesLoaded: summary.metrics.loadedCities,
  defaultYear: manifest.defaultYear,
  defaultShardBytes: defaultShard.byteLength,
  defaultShardGzipBytes: gzipSync(defaultShard).byteLength,
  status: "ok"
}, null, 2));
