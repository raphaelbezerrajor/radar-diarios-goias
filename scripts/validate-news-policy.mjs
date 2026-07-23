import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { validateEditorialBrief } from "../src/lib/editorial/curation.mjs";

const root = process.cwd();
const readJson = async (...parts) => JSON.parse(await readFile(path.join(root, ...parts), "utf8"));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const records = await readJson("src", "generated", "site-records.json");
const site = await readJson("src", "generated", "site-data.json");
const julyIndex = await readJson("public", "data", "july-news-index.json");
const previews = await readJson("data", "trindade", "source-previews.json");
const curationQueue = await readJson("data", "editorial", "curation-queue.json");
const curatedBriefs = await readJson("data", "editorial", "curated-briefs.json");
const automatic = records.filter((item) => item.publicationMode === "automatic_document_news");
const institutionalPattern = /\/(?:noticia|noticias|news|imprensa|agencia-de-noticias)(?:\/|\?|$)/i;

assert(automatic.length >= 7_500, `A publicação ato a ato de julho ficou incompleta: ${automatic.length}.`);
assert(records.filter((item) => item.kind === "ato").length >= 2_919, "Os 2.919 atos de Trindade não foram preservados.");
assert(records.filter((item) => item.kind === "tcm_process").length === 445, "Os 445 dossiês confirmados do TCM-GO não foram preservados.");
assert(records.filter((item) => item.publicationMode === "repository_record").length >= 2_500, "Atos burocráticos demais entraram no noticiário.");
assert(julyIndex.total === julyIndex.records.length, "O índice de notícias de julho está truncado.");
assert(julyIndex.total === site.metrics.julyStories, "A contagem pública de julho diverge do índice.");
assert(julyIndex.records.every((item, index, items) => index === 0 || items[index - 1].date >= item.date), "Julho não está ordenado do mais recente para o mais antigo.");
assert(site.timeline.year === site.metrics.currentYear, "A linha do tempo não usa o ano editorial corrente.");
assert(site.timeline.stories.every((item) => Number(item.year) === site.timeline.year), "A linha do tempo mistura fatos históricos com o ano corrente.");
assert(site.leadStory.year === site.timeline.year, "A manchete principal não pertence ao ano corrente.");
assert(curationQueue.candidates.length >= 150, "A fila de curadoria perdeu pautas relevantes.");
assert(curationQueue.summary.candidates === curationQueue.candidates.length, "O resumo da fila de curadoria diverge dos candidatos.");
assert(curationQueue.candidates.every((item, index, items) =>
  index === 0
  || items[index - 1].date > item.date
  || (items[index - 1].date === item.date && items[index - 1].priority >= item.priority)
), "A fila de curadoria não está em ordem editorial.");

for (const candidate of curationQueue.candidates) {
  assert(["pending", "brief_exists"].includes(candidate.status), `Estado inválido na fila: ${candidate.id}.`);
  assert(/^https?:\/\//i.test(candidate.source?.url || ""), `Candidato sem fonte oficial: ${candidate.id}.`);
  assert(candidate.requestedOutput?.publishAutomatically === false, `Candidato autorizou publicação automática: ${candidate.id}.`);
}

for (const brief of curatedBriefs.briefs || []) {
  const validation = validateEditorialBrief(brief);
  assert(validation.valid, `Brief inválido ${brief.id}: ${validation.issues.join(", ")}.`);
  const record = records.find((item) => item.id === brief.id);
  if (brief.status === "approved") {
    assert(record?.publicationMode === "curated_document_news", `Brief aprovado não foi aplicado: ${brief.id}.`);
  } else {
    assert(record?.publicationMode !== "curated_document_news", `Rascunho alterou a publicação: ${brief.id}.`);
  }
}

for (const item of automatic) {
  assert(item.sourceType === "official_document", `Fonte não oficial em publicação automática: ${item.id}.`);
  assert(/^https?:\/\//i.test(item.sourceUrl || ""), `Matéria sem URL oficial: ${item.id}.`);
  assert(!institutionalPattern.test(item.sourceUrl), `Reportagem institucional entrou na coleta: ${item.id}.`);
  assert(item.title && item.deck, `Matéria sem título ou olho: ${item.id}.`);
  assert(Array.isArray(item.paragraphs) && item.paragraphs.length >= 2, `Matéria sem dois parágrafos documentais: ${item.id}.`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(item.date || ""), `Matéria sem data válida do ato: ${item.id}.`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(item.publishedAt || ""), `Matéria sem data de publicação: ${item.id}.`);
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
  curationApproved: (curatedBriefs.briefs || []).filter((brief) => brief.status === "approved").length,
  status: "ok"
}, null, 2));
