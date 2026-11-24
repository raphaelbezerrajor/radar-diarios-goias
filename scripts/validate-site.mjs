import { readFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();
const buildRoot = path.resolve(root, process.env.PAUTEIRO_BUILD_DIR || "dist");
const readJson = async (...parts) => JSON.parse(await readFile(path.join(root, ...parts), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const summary = await readJson("public", "data", "site-summary.json");
const manifest = await readJson("public", "data", "site-search-manifest.json");
const search = await readJson("public", "data", "site-search.json");
const defaultShard = await readFile(path.join(root, "public", "data", "search", manifest.defaultFile));
const home = await readFile(path.join(buildRoot, "index.html"), "utf8");
const platform = await readFile(path.join(buildRoot, "pauteiro", "index.html"), "utf8");
const trindade = await readFile(path.join(buildRoot, "trindade", "index.html"), "utf8");
const timeline = await readFile(path.join(buildRoot, "linha-do-tempo", "index.html"), "utf8");
const july = await readFile(path.join(buildRoot, "julho", "index.html"), "utf8");
const searchPage = await readFile(path.join(buildRoot, "busca", "index.html"), "utf8");
const checkedStory = await readFile(path.join(buildRoot, "base", "trindade-noticia-shows-festival-gastronomico-2026", "index.html"), "utf8");
const checkedSourcePage = await readFile(path.join(buildRoot, "base", "julho-documento-goiania-8886-mutirama-contrato-emergencial-510-milhoes", "index.html"), "utf8");
const checkedActNews = await readFile(path.join(buildRoot, "base", "trindade-ato-agm-106613-e4566c23-ccf266959c8d", "index.html"), "utf8");
const ids = new Set(search.records.map((record) => record.id));
const trindadeCount = search.records.filter((record) => record.city === "Trindade").length;

assert(search.total === search.records.length, "Contagem total da busca diverge dos registros.");
assert(manifest.total === search.total, "Manifesto e base completa divergem.");
assert(ids.size === search.records.length, "A busca contém identificadores duplicados.");
assert(trindadeCount >= 5064, `A integração de Trindade perdeu registros; recebeu ${trindadeCount}.`);
assert(summary.metrics.records === search.total, "Resumo do site e base de busca divergem.");
assert(summary.metrics.trindadeActs === 2919, "A base deveria preservar os 2.919 atos estruturados.");
assert(gzipSync(defaultShard).byteLength < 1_200_000, "O recorte padrão ficou pesado demais para celular.");
assert(home.includes("PAUTEIRO"), "A identidade principal não aparece na capa.");
assert(home.includes('aria-label="Capa e editorias"') && (!summary.leadStory || home.includes('class="sheet"')), "A navegação por editorias ou a manchete não aparece na capa.");
const paperAsset = "assets/caderno/papel.css";
assert(home.includes(paperAsset) && (await stat(path.join(buildRoot, paperAsset))).size > 0, "A folha de estilo do caderno não foi empacotada.");
const layoutPages = [platform, trindade, timeline, july, searchPage, checkedStory, checkedActNews,
  ...await Promise.all(["goias", "municipios", "controle"].map(route => readFile(path.join(buildRoot, route, "index.html"), "utf8")))];
assert(layoutPages.every(html => html.includes('class="caderno-interno"') && html.includes(paperAsset)), "Uma página interna ainda usa a apresentação anterior.");
const newsroom = await readFile(path.join(root, "editorial", "local", "index.html"), "utf8");
assert(newsroom.includes(paperAsset) && newsroom.includes('id="placement"') && newsroom.includes('id="section-id"'), "A redação está sem o caderno ou os campos de distribuição.");
for (const section of Object.keys(summary.desks)) {
  const sectionHtml = await readFile(path.join(buildRoot, 'editorias', section, 'index.html'), 'utf8');
  assert(sectionHtml.includes('aria-current="page"'), "Editoria sem página ativa: " + section);
}
assert(home.includes("Agência de notícias documentais"), "A capa não apresenta o Pauteiro como agência documental.");
assert(!home.includes('class="hero-image"') && !home.includes('class="story-media"'), "O PDF voltou a ser usado como foto na capa.");
assert(platform.includes("Uma agência organizada em nove etapas"), "A página da agência não foi renderizada.");
assert(platform.includes("Publicação") && platform.includes("Matérias documentais verificadas entram diariamente"), "A publicação documental não aparece como ativa.");
assert(trindade.includes("oito anos"), "A página de Trindade não explica o horizonte de cobertura.");
assert(trindade.includes("Tudo de Trindade, organizado por área"), "Os módulos municipais de Trindade não aparecem.");
assert(timeline.includes("Linha do tempo") && timeline.includes("O mais recente vem primeiro."), "A linha do tempo não apresenta a ordenação cronológica.");
assert(july.includes("O mais recente sempre vem primeiro.") && july.includes("data-july-list"), "A cobertura navegável de julho não foi renderizada.");
assert(searchPage.includes("data-search-root"), "A busca pública não foi renderizada.");
assert(checkedStory.includes("Notícia documental") && checkedStory.includes("Publicado pelo Pauteiro"), "O acervo já publicado não recebeu a apresentação jornalística.");
assert((checkedStory.includes('"@type":"NewsArticle"') || checkedStory.includes('"@type":"Article"')) && checkedStory.includes('"@type":"BreadcrumbList"'), "Os schemas editoriais não foram renderizados.");
assert(!checkedStory.includes('class="detail-figure"'), "A matéria voltou a exibir imagem documental como foto.");
assert(checkedStory.includes("Abrir fonte original"), "A matéria não oferece o documento original.");
assert(checkedSourcePage.includes("Conferir página citada") && checkedSourcePage.includes("do_20261019_000008886.pdf"), "A página citada ou o PDF original não estão acessíveis.");
assert(checkedStory.match(/Dois extratos de contratos artísticos publicados pelo Município/g)?.length === 1, "A matéria checada repete o resumo no corpo.");
assert(checkedActNews.includes("Documento no repositório"), "O ato burocrático não foi separado do noticiário.");
assert(checkedActNews.includes("Estado editorial: repositório"), "O ato burocrático não foi preservado corretamente no repositório.");
assert(checkedActNews.includes("Prefeitura Municipal de Trindade publicou PORTARIA Nº 060/2025-GAB"), "O texto documental do ato não aparece no repositório.");
assert(checkedActNews.includes("A matéria consta na edição 3411, na página 85"), "O detalhamento documental do ato não aparece no corpo.");
assert(!checkedActNews.includes('class="detail-summary"'), "O lead documental do ato está repetido no corpo.");
assert((await stat(path.join(buildRoot, "index.html"))).size < 90_000, "A capa HTML ultrapassou o limite de peso.");

console.log(JSON.stringify({
  records: search.total,
  trindade: trindadeCount,
  acts: summary.metrics.trindadeActs,
  currentYearStories: summary.metrics.currentYearStories,
  citiesLoaded: summary.metrics.loadedCities,
  defaultYear: manifest.defaultYear,
  defaultMonth: manifest.defaultMonth,
  defaultShardBytes: defaultShard.byteLength,
  defaultShardGzipBytes: gzipSync(defaultShard).byteLength,
  status: "ok"
}, null, 2));
