import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { validateEditorialBrief } from "../src/lib/editorial/curation.mjs";
import { recentFirst, courtId, isAlego } from "../src/lib/editorial/control-coverage.mjs";
import { sections, inGeneralNews } from "../src/lib/editorial/distribution.mjs";

const root = process.cwd();
const readJson = async (...parts) => JSON.parse(await readFile(path.join(root, ...parts), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const records = await readJson("src", "generated", "site-records.json");
const site = await readJson("src", "generated", "site-data.json");
const julyIndex = await readJson("public", "data", "july-news-index.json");
const julySource = await readJson("data", "trindade", "july-document-news-2026.json");
const editedDocumentNews = await readJson("data", "trindade", "control-news-2026.json");
const previews = await readJson("data", "trindade", "source-previews.json");
const publicQueue = await readJson("data", "editorial", "curation-queue.json");
assert(publicQueue.candidates.length === 0, "Fila privada presente no pacote público.");
const privateQueueDir = process.env.PAUTEIRO_PRIVATE_DIR;
const curationQueue = privateQueueDir
  ? JSON.parse(await readFile(path.join(privateQueueDir, "curation-queue.json"), "utf8"))
  : publicQueue;
const curatedBriefs = await readJson("data", "editorial", "curated-briefs.json");
const publicationHolds = await readJson("data", "editorial", "publication-holds.json");
const automatic = records.filter((item) => item.publicationMode === "automatic_document_news");
const institutionalPattern = /\/(?:noticia|noticias|news|imprensa|agencia-de-noticias)(?:\/|\?|$)/i;

const recordIds = new Set(records.map((item) => item.id));
assert(new Set((publicationHolds.items || []).map((item) => item.id)).size === (publicationHolds.items || []).length, "Há bloqueios editoriais duplicados.");
for (const hold of publicationHolds.items || []) {
  const source = (julySource.items || []).find((item) => item.id === hold.id);
  const record = records.find((item) => item.id === hold.id);
  assert(source?.document_sha256 === hold.documentSha256, `Fonte alterada no bloqueio editorial: ${hold.id}.`);
  assert(record?.recordType === "record", `Pauta sob bloqueio editorial foi publicada como notícia: ${hold.id}.`);
  if (hold.archiveCorrection) {
    assert(record.title === hold.archiveCorrection.title, `Correção de acervo não aplicada: ${hold.id}.`);
    assert(record.deck === hold.archiveCorrection.deck, `Olho corrigido não aplicado: ${hold.id}.`);
  }
}
const replacedDocumentIds = new Set((editedDocumentNews.items || []).map((item) => item.origin_item_id).filter(Boolean));
assert((editedDocumentNews.items || []).filter((item) => item.origin_item_id).every((item) =>
  (julySource.items || []).some((source) => source.id === item.origin_item_id) && recordIds.has(item.id)
), "Há substituição editorial sem documento original ou matéria publicada.");
const nonDuplicatedJulySource = (julySource.items || [])
  .filter((item) => item.editorial_status !== "needs_review")
  .filter((item) => !replacedDocumentIds.has(item.id))
  .filter((item) => !(item.source_id === "agm" && item.city === "Trindade"));
assert(nonDuplicatedJulySource.every((item) => recordIds.has(item.id)), "Há documentos de julho ausentes do acervo unificado.");
assert(automatic.length >= 500, `O noticiário documental relevante ficou abaixo do baseline: ${automatic.length}.`);
assert(
  records.filter((item) => item.recordType === "story" && item.publicationMode === "automatic_document_news" && item.id?.startsWith("jul26-")).every((item) => Number(item.importance) >= 80),
  "Atos de baixo valor-notícia continuam apresentados como reportagem."
);
assert(records.filter((item) => item.kind === "ato").length >= 2_919, "Os 2.919 atos de Trindade não foram preservados.");
assert(records.filter((item) => item.kind === "tcm_process").length === 445, "Os 445 dossiês confirmados do TCM-GO não foram preservados.");
assert(records.filter((item) => item.publicationMode === "repository_record").length >= 18_000, "Atos burocráticos demais entraram no noticiário.");
assert(julyIndex.total === julyIndex.records.length, "O índice de notícias de julho está truncado.");
assert(julyIndex.total === site.metrics.julyStories, "A contagem pública de julho diverge do índice.");
assert(julyIndex.records.every((item, index, items) => index === 0 || items[index - 1].date >= item.date), "Julho não está ordenado do mais recente para o mais antigo.");
assert(site.timeline.year === site.metrics.currentYear, "A linha do tempo não usa o ano editorial corrente.");
assert(site.timeline.stories.every((item) => Number(item.year) === site.timeline.year), "A linha do tempo mistura fatos históricos com o ano corrente.");
const cover = [site.leadStory, ...site.heroSidebar].filter(Boolean);
const expectedCover = records.filter(r => r.placement === "capa" && Number(r.year) === site.timeline.year).sort(recentFirst);
assert(JSON.stringify(cover.map(r => r.id)) === JSON.stringify(expectedCover.map(r => r.id)), "A capa diverge da distribuição da redação.");
assert(cover.every(r => r.recordType === "story" && r.sourceType === "official_document"), "Matéria de capa sem fonte oficial.");
assert(records.filter(r => r.recordType === 'story').every(r => Object.hasOwn(sections, r.sectionId)), 'Há matéria publicada sem editoria.');
for (const id of Object.keys(sections)) {
  const expected = records.filter(r => r.recordType === 'story' && r.sectionId === id && r.placement !== 'relacionada').sort(recentFirst);
  assert(JSON.stringify(site.desks[id].map(r => r.id)) === JSON.stringify(expected.map(r => r.id)), "Distribuição incorreta na editoria " + id);
}
assert(site.metrics.controlStories >= 19, "A cobertura verificada de DOE, TCM e TCE está incompleta.");
assert(site.metrics.tceStories >= 5, "A cobertura semanal verificada do TCE-GO está incompleta.");
const courtCandidates = records.filter(r => r.recordType === "story" && !isAlego(r) && courtId(r) && Number(r.year) === site.timeline.year && inGeneralNews(r));
assert(site.controlFront.length === Math.min(courtCandidates.length, 8), "Bloco semanal de fiscalização incompleto.");
for (const court of new Set(courtCandidates.map(courtId))) {
  assert(site.controlFront.some(r => courtId(r) === court), "Tribunal ausente da seleção de controle: " + court);
}
assert(site.controlFront.every(r => !r.placement || r.placement === 'capa'), "A cobertura de controle promoveu leitura restrita.");
assert(site.controlFront.every((item) => /^https:\/\//i.test(item.sourceUrl || "")), "O bloco semanal contém matéria sem fonte oficial HTTPS.");
assert(
  site.heroSidebar.every((item) => item.id !== site.leadStory.id),
  "A manchete principal foi repetida nos destaques laterais."
);
if (privateQueueDir) {
  assert(curationQueue.candidates.length >= 150, "A fila privada de curadoria perdeu pautas relevantes.");
  assert(curationQueue.summary.candidates === curationQueue.candidates.length, "O resumo da fila privada diverge dos candidatos.");
}
assert(curationQueue.candidates.every((item, index, items) =>
  index === 0
  || items[index - 1].date > item.date
  || (items[index - 1].date === item.date && items[index - 1].priority >= item.priority)
), "A fila de curadoria não está em ordem editorial.");

for (const candidate of curationQueue.candidates) {
  assert(["pending", "brief_exists"].includes(candidate.status), `Estado inválido na fila: ${candidate.id}.`);
  assert(/^https?:\/\//i.test(candidate.source?.url || ""), `Candidato sem fonte oficial: ${candidate.id}.`);
  assert(
    candidate.requestedOutput?.publishAutomatically === false,
    `Política de publicação automática divergente: ${candidate.id}.`
  );
}

for (const brief of curatedBriefs.briefs || []) {
  const validation = validateEditorialBrief(brief);
  assert(validation.valid, `Brief inválido ${brief.id}: ${validation.issues.join(", ")}.`);
  const record = records.find((item) => item.id === brief.id);
  if (brief.status === "approved") {
    assert(record?.publicationMode === "curated_document_news", `Curadoria publicável não foi aplicada: ${brief.id}.`);
  } else {
    assert(record?.publicationMode !== "curated_document_news", `Brief bloqueado alterou a publicação: ${brief.id}.`);
  }
}

for (const item of automatic) {
  assert(item.sourceType === "official_document", `Fonte não oficial em publicação automática: ${item.id}.`);
  assert(/^https?:\/\//i.test(item.sourceUrl || ""), `Matéria sem URL oficial: ${item.id}.`);
  assert(!institutionalPattern.test(item.sourceUrl), `Reportagem institucional entrou na coleta: ${item.id}.`);
  assert(item.title && item.deck, `Matéria sem título ou olho: ${item.id}.`);
  assert(Array.isArray(item.paragraphs) && item.paragraphs.length >= 2, `Matéria sem dois parágrafos documentais: ${item.id}.`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(item.date || ""), `Matéria sem data válida do ato: ${item.id}.`);
  assert(!item.publishedAt || /^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt), `Data editorial inválida: ${item.id}.`);
}

for (const preview of previews.items || []) {
  assert(/^https:\/\//i.test(preview.source_url || ""), `Prévia sem fonte HTTPS: ${preview.record_id}.`);
  assert(Number(preview.page) > 0, `Prévia sem página: ${preview.record_id}.`);
  assert(/^[a-f0-9]{64}$/.test(preview.source_sha256 || ""), `Prévia sem hash do PDF: ${preview.record_id}.`);
  assert(/^[a-f0-9]{64}$/.test(preview.preview_sha256 || ""), `Prévia sem hash próprio: ${preview.record_id}.`);
  const file = await stat(path.join(root, "public", preview.src.replace(/^\//, "")));
  assert(file.size === preview.bytes, `Tamanho divergente na prévia ${preview.record_id}.`);
  assert(file.size < 350_000, `Prévia pesada demais para celular: ${preview.record_id}.`);
}

console.log(JSON.stringify({
  automaticDocumentNews: automatic.length,
  julyDocumentNews: julyIndex.total,
  repositoryOnly: records.filter((item) => item.publicationMode === "repository_record").length,
  currentYear: site.timeline.year,
  currentTimeline: site.timeline.total,
  institutionalNewsExcluded: site.metrics.excludedInstitutionalNews,
  sourcePagePreviews: previews.items?.length || 0,
  curationCandidates: curationQueue.candidates.length,
  curationBriefs: curatedBriefs.briefs?.length || 0,
  curationApplied: (curatedBriefs.briefs || []).filter((brief) => brief.status === "approved").length,
  curationApproved: (curatedBriefs.briefs || []).filter((brief) => brief.status === "approved").length,
  status: "ok"
}, null, 2));
