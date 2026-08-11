import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createTrindadeJsonProvider, isPublicDocumentUrl } from "../src/lib/municipal/trindade-json-provider.mjs";
import {
  assessActNewsValue,
  assessTcmNewsValue,
  buildActNews,
  buildStateNews,
  buildTcmNews,
  hasPrimarySource,
  isPrimaryOfficialSource
} from "../src/lib/editorial/document-news.mjs";
import { applyCuration } from "../src/lib/editorial/curation.mjs";
import { buildFrontPagePackage, rankFrontPageStories } from "../src/lib/editorial/front-page.mjs";

const root = process.cwd();
const generatedDir = path.join(root, "src", "generated");
const publicDataDir = path.join(root, "public", "data");
const publicDownloadsDir = path.join(root, "public", "downloads");
const publicSearchDir = path.join(publicDataDir, "search");
const trindadeProvider = createTrindadeJsonProvider({ dataDir: path.join(root, "data", "trindade") });

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function trimText(value, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function buildSearchText(record) {
  return trimText(normalizeText([
    record.title,
    trimText(record.deck, 96),
    record.city,
    record.type,
    record.sourceFamily,
    ...(record.tags || []).slice(0, 6)
  ].join(" ")), 320);
}

function buildSearchRecord(item) {
  return {
    id: item.id,
    path: item.path,
    city: item.city,
    date: item.date,
    year: item.year,
    type: item.type,
    title: item.title,
    deck: trimText(item.deck, 72),
    sourceFamily: item.sourceFamily,
    marker: trimText(item.marker || item.sourceNote || "", 36),
    recordType: item.recordType,
    search: item.search
  };
}

function compareByDateDesc(a, b) {
  if (a.date === b.date) return (b.importance || 0) - (a.importance || 0);
  return String(b.date || "").localeCompare(String(a.date || ""));
}

function countBy(items, selector) {
  const counts = new Map();
  items.forEach((item) => {
    const key = selector(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function readJson(...parts) {
  return JSON.parse(await fs.readFile(path.join(root, ...parts), "utf8"));
}

async function readJsonOptional(fallback, ...parts) {
  try {
    return await readJson(...parts);
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function readWindowObject(fileName, key) {
  const code = await fs.readFile(path.join(root, fileName), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window[key];
}

function imageForNewsItem(item) {
  if (item?.image?.src?.startsWith("http")) return item.image.src;
  if (item?.slug?.includes("jubs")) return "/assets/trindade/jubs-trindade-2026.jpg";
  if (item?.slug?.includes("camara") || item?.slug?.includes("concurso")) return "/assets/trindade/camara-concurso-2026.jpg";
  return "/assets/trindade/og.png";
}

function resolveSourceFamily(city, sourceBucket, sourceLabel, municipalityByName, sourceLibrary) {
  const normalizedCity = normalizeText(city);
  if (sourceBucket && sourceLibrary[sourceBucket]) return sourceLibrary[sourceBucket].label;
  if (normalizedCity === "estado de goias") return "Estado de Goias / DOE";
  if (normalizedCity === "tjgo") return "TJGO / DJE";
  if (normalizedCity === "goiania") return "Goiania / Sileg";
  if (normalizeText(sourceLabel).includes("mpgo")) return "MPGO / DOMP";
  const municipality = municipalityByName.get(normalizedCity);
  return municipality?.diary_family || sourceLabel || "Fonte oficial";
}

function normalizeStateEntry(entry, context) {
  const city = entry.city || context.city || "Goias";
  const date = entry.date;
  const article = buildStateNews(entry);
  const title = article.title;
  const sourceLabel = entry.source_label || context.label || "Fonte oficial";
  const sourceFamily = resolveSourceFamily(
    city,
    context.sourceId,
    sourceLabel,
    context.municipalityByName,
    context.sourceLibrary
  );
  const image = entry.source_image?.src
    ? {
        src: entry.source_image.src,
        alt: entry.source_image.alt || `Página do documento que originou a matéria: ${title}`,
        credit: entry.source_image.credit || sourceLabel,
        caption: entry.source_image.caption || entry.page_marker || entry.source_note,
        kind: "source-page"
      }
    : {
        src: "/assets/trindade/og.png",
        alt: title,
        credit: "Painel Diário",
        kind: "fallback"
      };
  const slug = `goias-${slugify(city)}-${date}-${slugify(title).slice(0, 56)}`;
  return {
    id: slug,
    slug,
    path: `/base/${slug}/`,
    cluster: "goias",
    city,
    date,
    year: Number(String(date).slice(0, 4)),
    month: String(date).slice(0, 7),
    kind: "pauta",
    type: entry.tag || "Pauta",
    title,
    deck: article.deck,
    summary: article.summary,
    editoria: entry.editoria || context.editoria || "Atos publicos",
    sourceFamily,
    sourceLabel,
    sourceUrl: entry.source_url || null,
    sourceNote: entry.source_note || context.note || "",
    scope: entry.scope || (sourceFamily.includes("Estado") ? "Estadual" : "Municipal"),
    tags: [entry.tag, entry.editoria, city, sourceFamily].filter(Boolean),
    image,
    marker: entry.source_note || "",
    importance: 60 + (Number(entry.highlight_score) || 0) * 5,
    hasOriginalSource: Boolean(entry.source_url),
    recordType: "story",
    sourceType: "official_document",
    publicationMode: "automatic_document_news",
    editorialStatus: "published",
    paragraphs: article.paragraphs,
    documentReference: entry.page_marker || entry.source_note || ""
  };
}

function normalizeTrindadeNews(item) {
  const slug = `trindade-noticia-${item.slug || slugify(item.title).slice(0, 56)}`;
  return {
    id: slug,
    slug,
    path: `/base/${slug}/`,
    cluster: "trindade",
    city: "Trindade",
    date: item.published_at,
    year: Number(String(item.published_at).slice(0, 4)),
    month: String(item.published_at).slice(0, 7),
    kind: "noticia",
    type: item.category || "Noticia",
    title: item.title,
    deck: item.deck || item.paragraphs?.[0] || "",
    summary: item.paragraphs?.join(" ") || item.deck || "",
    editoria: item.category || "Trindade",
    sourceFamily: "Trindade | Noticias verificadas",
    sourceLabel: item.sources?.[0]?.label || "Trindade em Dados",
    sourceUrl: item.sources?.[0]?.url || null,
    sourceNote: item.status_label || "",
    scope: "Municipal",
    tags: item.tags || [],
    image: {
      src: imageForNewsItem(item),
      alt: item.image?.alt || item.title,
      credit: item.image?.credit || "Trindade em Dados",
      kind: item.image?.kind || "local"
    },
    marker: item.status_label || "",
    importance: 90,
    hasOriginalSource: Boolean(item.sources?.[0]?.url),
    recordType: "story",
    sourceType: "official_document",
    publicationMode: "edited_document_news",
    editorialStatus: "published",
    paragraphs: item.paragraphs || []
  };
}

function normalizeTrindadeAct(item, preview) {
  const article = buildActNews(item);
  const totalValue = article.valueTotal;
  const newsValue = assessActNewsValue(item, totalValue);
  const julyPublication = String(item.edition_date || "").startsWith("2026-07");
  const publishedAsStory = newsValue.publish || julyPublication;
  const actType = item.act_type || "ato";
  const slug = `trindade-ato-${slugify(item.id)}`;
  const pageLabel = item.page_start
    ? item.page_end && item.page_end !== item.page_start
      ? `p. ${item.page_start}-${item.page_end}`
      : `p. ${item.page_start}`
    : "";
  return {
    id: item.id,
    slug,
    path: `/base/${slug}/`,
    cluster: "trindade",
    city: "Trindade",
    date: item.edition_date,
    year: Number(String(item.edition_date).slice(0, 4)),
    month: String(item.edition_date).slice(0, 7),
    kind: "ato",
    actCode: actType,
    type: titleCase(actType),
    title: article.title,
    officialTitle: article.officialTitle,
    deck: article.deck,
    summary: article.summary,
    editoria: item.public_body || "Trindade",
    sourceFamily: "Trindade | Diario Oficial",
    sourceLabel: item.public_body || "Prefeitura de Trindade",
    sourceUrl: isPublicDocumentUrl(item.source_url) ? item.source_url : null,
    sourceNote: `Edicao ${item.edition_number}${pageLabel ? ` · ${pageLabel}` : ""}`,
    scope: "Municipal",
    tags: [actType, item.public_body, ...(item.reference_numbers || [])].filter(Boolean),
    image: preview ? {
      src: preview.src,
      alt: `Página ${preview.page} do Diário Oficial com ${article.officialTitle}`,
      credit: "Diário Municipal de Goiás · recorte documental do Pauteiro",
      caption: `Edição ${item.edition_number}, página ${preview.page}. Imagem comprimida sem alteração do conteúdo do documento.`,
      kind: "source-page"
    } : {
      src: "/assets/trindade/og.png",
      alt: article.officialTitle,
      credit: "Trindade em Dados",
      kind: "fallback"
    },
    marker: `Ed. ${item.edition_number}${pageLabel ? ` · ${pageLabel}` : ""}`,
    importance: newsValue.score,
    newsValue,
    hasOriginalSource: Boolean(item.source_url),
    recordType: publishedAsStory ? "story" : "record",
    sourceType: "official_document",
    publicationMode: publishedAsStory ? "automatic_document_news" : "repository_record",
    editorialStatus: publishedAsStory ? "published" : "archived",
    prominence: newsValue.publish ? "section" : julyPublication ? "archive" : "repository",
    paragraphs: article.paragraphs,
    valueTotal: totalValue,
    pageStart: article.pageStart,
    pageEnd: article.pageEnd,
    documentReference: `Edição ${item.edition_number}${pageLabel ? ` · ${pageLabel}` : ""}`,
    sourceHash: preview?.source_sha256 || null
  };
}

function normalizeJulyDocumentNews(item, preview) {
  const slug = `julho-documento-${slugify(item.id).slice(0, 96)}`;
  return {
    id: item.id,
    slug,
    path: `/base/${slug}/`,
    cluster: item.source_id === "alego" ? "goias" : "municipios",
    city: item.city,
    date: item.date,
    year: Number(String(item.date).slice(0, 4)),
    month: String(item.date).slice(0, 7),
    kind: "ato",
    actCode: item.act_type,
    type: item.type_label || titleCase(item.act_type || "ato"),
    title: item.title,
    officialTitle: item.official_title,
    deck: item.deck,
    summary: item.summary,
    paragraphs: item.paragraphs || [],
    keyFindings: item.key_findings || [],
    processTimeline: item.process_timeline || [],
    editoria: item.public_body || "Atos públicos",
    sourceFamily: item.source_name || "Documento oficial",
    sourceLabel: item.source_label || item.public_body || "Fonte oficial",
    sourceUrl: item.official_url || item.source_landing_url || null,
    sourceActionLabel: item.source_action_label || null,
    processNumber: item.process_number || null,
    processUrl: item.process_url || null,
    sourceNote: item.document_reference || "",
    scope: item.scope || "Municipal",
    tags: [
      item.act_type,
      item.city,
      item.public_body,
      ...(item.reference_numbers || []),
      ...(item.cnpjs || [])
    ].filter(Boolean),
    image: preview ? {
      src: preview.src,
      alt: `Página ${preview.page} do documento oficial com ${item.official_title || item.title}`,
      credit: `${item.source_name || "Fonte oficial"} · recorte documental do Pauteiro`,
      caption: `${item.document_reference}. Imagem comprimida sem alteração do conteúdo do documento.`,
      kind: "source-page"
    } : {
      src: "/assets/trindade/og.png",
      alt: item.official_title || item.title,
      credit: item.source_name || "Fonte oficial",
      kind: "fallback"
    },
    marker: item.document_reference || "",
    importance: Number(item.importance) || 25,
    newsValue: item.news_value || { score: Number(item.importance) || 25, reasons: [] },
    prominence: item.prominence || "archive",
    hasOriginalSource: Boolean(item.official_url || item.source_landing_url),
    recordType: "story",
    sourceType: "official_document",
    publicationMode: item.publication_mode || "automatic_document_news",
    editorialStatus: "published",
    pageStart: item.page_start,
    pageEnd: item.page_end,
    documentReference: item.document_reference || "",
    sourceHash: item.document_sha256 || null,
    actHash: item.act_sha256 || null,
    confidence: item.confidence || null,
    externalIdentifier: item.external_identifier || null,
    updatedAt: item.updated_at || item.published_at || item.date
  };
}

function normalizeTcmDossier(dossier) {
  const article = buildTcmNews(dossier);
  const latest = article.latest;
  const newsValue = assessTcmNewsValue(dossier, latest);
  const slug = `trindade-tcm-processo-${slugify(dossier.normalized_process_number || dossier.process_number)}`;
  const pages = latest.source?.pages || [];
  const pageLabel = pages.length ? `p. ${pages.join(", ")}` : "páginas não informadas";
  return {
    id: `tcm-${dossier.normalized_process_number || slugify(dossier.process_number)}`,
    slug,
    path: `/base/${slug}/`,
    cluster: "trindade",
    city: "Trindade",
    date: dossier.last_publication,
    year: Number(String(dossier.last_publication).slice(0, 4)),
    month: String(dossier.last_publication).slice(0, 7),
    kind: "tcm_process",
    type: "TCM-GO",
    title: article.title,
    deck: article.deck,
    summary: article.summary,
    paragraphs: article.paragraphs,
    editoria: "Controle externo",
    sourceFamily: "TCM-GO | Diário Oficial de Contas",
    sourceLabel: [latest.decision_type, latest.decision_number].filter(Boolean).join(" ") || `Processo ${dossier.process_number}`,
    sourceUrl: isPublicDocumentUrl(latest.source?.official_url) ? latest.source.official_url : "https://www.tcmgo.tc.br/doc/index.jsf",
    sourceNote: `Processo ${dossier.process_number} · ${pageLabel}`,
    scope: "Municipal",
    tags: ["TCM-GO", article.result, ...(dossier.natures || []), ...(dossier.bodies || [])].filter(Boolean),
    image: {
      src: "/assets/trindade/og.png",
      alt: `Documento do TCM-GO referente ao processo ${dossier.process_number}`,
      credit: "TCM-GO",
      kind: "fallback"
    },
    marker: dossier.priority ? `Prioridade documental: ${dossier.priority}` : `Processo ${dossier.process_number}`,
    importance: newsValue.score,
    newsValue,
    hasOriginalSource: true,
    recordType: newsValue.publish ? "story" : "record",
    sourceType: "official_document",
    publicationMode: newsValue.publish ? "automatic_document_news" : "repository_record",
    editorialStatus: newsValue.publish ? "published" : "archived",
    documentReference: `Processo ${dossier.process_number} · ${pageLabel}`,
    sourceHash: latest.source?.pdf_sha256 || null,
    confidence: dossier.confidence || latest.confidence || null
  };
}

function normalizeUnifiedRecord(item) {
  const slug = `trindade-base-${slugify(item.id || item.title).slice(0, 64)}`;
  return {
    id: item.id || slug,
    slug,
    path: `/base/${slug}/`,
    cluster: "trindade",
    city: "Trindade",
    date: item.date || null,
    year: item.date ? Number(String(item.date).slice(0, 4)) : null,
    month: item.date ? String(item.date).slice(0, 7) : null,
    kind: item.type || "registro",
    type: titleCase(item.type || "registro"),
    title: item.title,
    deck: item.subtitle || item.summary || "",
    summary: item.summary || item.subtitle || "",
    editoria: "Base publica de Trindade",
    sourceFamily: "Trindade | Base integrada",
    sourceLabel: item.source_label || "Trindade em Dados",
    sourceUrl: null,
    sourceActionLabel: null,
    sourceNote: item.subtitle || "",
    scope: "Municipal",
    tags: item.tags || [],
    image: {
      src: "/assets/trindade/og.png",
      alt: item.title,
      credit: "Trindade em Dados",
      kind: "fallback"
    },
    marker: item.subtitle || "",
    importance: 20,
    hasOriginalSource: false,
    recordType: "record"
  };
}

function attachSearch(record) {
  const search = buildSearchText(record);
  return { ...record, search };
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function sortForSearch(items) {
  return [...items].sort((a, b) => {
    const byDate = compareByDateDesc(a, b);
    if (byDate !== 0) return byDate;
    return (b.importance || 0) - (a.importance || 0);
  });
}

function sourceCardFromLibrary(entry, stateCount) {
  return {
    id: entry.id,
    label: entry.label,
    officialUrl: entry.official_url,
    analysisFocus: entry.analysis_focus,
    materialTypes: entry.material_types,
    nextStep: entry.next_step,
    stateCount
  };
}

async function main() {
  const radar = await readJson("radar-diarios-goias-data.json");
  const archiveMeta = await readWindowObject("pauteiro-arquivo.js", "PAUTEIRO_ARCHIVE");
  const coverage = await readWindowObject("pauteiro-cobertura.js", "PAUTEIRO_COVERAGE");
  const [
    trindadeActs,
    trindadeAnalysis,
    trindadeCoverage,
    trindadeStatus,
    trindadeNews,
    trindadeUnifiedRecords,
    trindadeCamara,
    trindadeLegislative,
    tcmDossiers,
    sourcePreviews,
    municipalDiaries,
    alegoMonitor,
    julyDocumentNews,
    controlNews,
    curatedBriefs
  ] = await Promise.all([
    trindadeProvider.buscarAtos(),
    trindadeProvider.obterAnalise(),
    trindadeProvider.obterCoberturaDiario(),
    trindadeProvider.obterEstadoDaBase(),
    trindadeProvider.listarNoticias(),
    trindadeProvider.buscarRegistros(),
    trindadeProvider.obterCamara(),
    trindadeProvider.obterLegislativo(),
    trindadeProvider.obterDossiesTCM(),
    readJsonOptional({ items: [] }, "data", "trindade", "source-previews.json"),
    readJsonOptional({ sources: [], summary: {}, daily_check_windows: [], range: {} }, "data", "trindade", "municipal-diaries-2026.json"),
    readJsonOptional({ sources: [], summary: {}, daily_check_windows: [], analysis_queue: [], range: {} }, "data", "trindade", "alego-monitor-2026.json"),
    readJsonOptional({ items: [], summary: {}, period: {} }, "data", "trindade", "july-document-news-2026.json"),
    readJsonOptional({ items: [], summary: {}, period: {} }, "data", "trindade", "control-news-2026.json"),
    readJsonOptional({ briefs: [] }, "data", "editorial", "curated-briefs.json")
  ]);

  const municipalityByName = new Map(
    (coverage.municipality_catalog || []).map((item) => [normalizeText(item.name), item])
  );
  const sourceLibrary = archiveMeta.source_library || {};

  const archiveHighlights = [];
  for (const yearBucket of Object.values(archiveMeta.year_buckets || {})) {
    for (const source of Object.values(yearBucket.sources || {})) {
      if (!source?.manifest) continue;
      const sourceData = await readJson(...String(source.manifest).split("/"));
      for (const entry of (sourceData.highlight_entries || []).filter(isPrimaryOfficialSource)) {
        archiveHighlights.push(
          normalizeStateEntry(entry, {
            label: sourceData.label,
            note: sourceData.note,
            city: entry.city,
            sourceId: sourceData.source_id,
            municipalityByName,
            sourceLibrary
          })
        );
      }
    }
  }

  const stateRecords = dedupeById(
    (radar.entries || []).filter(isPrimaryOfficialSource).map((entry) =>
      normalizeStateEntry(entry, {
        municipalityByName,
        sourceLibrary,
        sourceId: null,
        label: entry.source_label,
        note: entry.source_note
      })
    ).concat(archiveHighlights)
  );

  const previewByRecord = new Map((sourcePreviews.items || []).map((item) => [item.record_id, item]));
  const normalizedTrindadeNews = trindadeNews.filter(hasPrimarySource).map(normalizeTrindadeNews);
  const normalizedTrindadeActs = trindadeActs.map((item) => normalizeTrindadeAct(item, previewByRecord.get(item.id)));
  const existingTrindadeActKeys = new Set(
    normalizedTrindadeActs
      .map((item) => String(item.id || "").match(/^agm-([^-]+)-([A-Z0-9]+)-/i))
      .filter(Boolean)
      .map((match) => `${match[1]}:${match[2].toUpperCase()}`)
  );
  const normalizedJulyDocumentNews = (julyDocumentNews.items || [])
    .filter((item) => {
      if (normalizeText(item.city) !== "trindade" || item.source_id !== "agm") return true;
      const editionId = String(item.edition_id || "").split(":").at(-1);
      const externalId = String(item.external_identifier || "").toUpperCase();
      return !externalId || !existingTrindadeActKeys.has(`${editionId}:${externalId}`);
    })
    .map((item) => normalizeJulyDocumentNews(item, previewByRecord.get(item.id)));
  const normalizedControlNews = (controlNews.items || [])
    .map((item) => normalizeJulyDocumentNews(item, previewByRecord.get(item.id)));
  const normalizedTcmNews = (tcmDossiers.dossiers || [])
    .filter((item) => item.scope_status === "trindade_confirmado")
    .map(normalizeTcmDossier);
  const curatedBriefById = new Map((curatedBriefs.briefs || []).map((brief) => [brief.id, brief]));
  const applyEditorialCuration = (item) => applyCuration(item, curatedBriefById.get(item.id));
  const editorialYear = Number(String(radar.cutoff_date || radar.updated_at).slice(0, 4));
  const editorialPublicationDate = [
    radar.updated_at,
    radar.cutoff_date,
    String(julyDocumentNews.generated_at || "").slice(0, 10),
    julyDocumentNews.period?.to
  ].filter(Boolean).sort().at(-1);
  const addPublicationMetadata = (item) => item.recordType === "story"
    ? { ...item, publishedAt: item.publishedAt || editorialPublicationDate }
    : item;
  const trindadeActIds = new Set(normalizedTrindadeActs.map((item) => item.id));
  const residualUnified = trindadeUnifiedRecords
    .filter((item) => item.type !== "ato" && item.type !== "noticia" && !trindadeActIds.has(item.id))
    .map(normalizeUnifiedRecord);

  const allRecords = sortForSearch(
    dedupeById(
      stateRecords
        .concat(normalizedTrindadeNews)
        .concat(normalizedTrindadeActs)
        .concat(normalizedJulyDocumentNews)
        .concat(normalizedControlNews)
        .concat(normalizedTcmNews)
        .concat(residualUnified)
        .map(applyEditorialCuration)
        .map(addPublicationMetadata)
        .map(attachSearch)
    )
  );

  const publishedNews = stateRecords
    .concat(normalizedTrindadeNews, normalizedTrindadeActs, normalizedJulyDocumentNews, normalizedControlNews, normalizedTcmNews)
    .filter((item) => item.recordType === "story")
    .map(applyEditorialCuration)
    .map(addPublicationMetadata);
  const timelineNews = sortForSearch(publishedNews.filter((item) => Number(item.year) === editorialYear));
  const frontPage = buildFrontPagePackage(timelineNews);
  const leadStory = frontPage.lead;
  const heroSidebar = frontPage.sidebar;
  const controlFront = rankFrontPageStories(
    normalizedControlNews.filter((item) => /TC[EM]-GO/.test(item.sourceFamily || ""))
  ).slice(0, 8);

  const stateFront = sortForSearch(stateRecords.map(applyEditorialCuration)
    .filter((item) => item.recordType === "story" && Number(item.year) === editorialYear)).slice(0, 8);
  const trindadeFront = sortForSearch(normalizedTrindadeNews.concat(normalizedTrindadeActs).map(applyEditorialCuration)
    .filter((item) => item.recordType === "story" && Number(item.year) === editorialYear)).slice(0, 8);
  const actsFront = sortForSearch(
    normalizedTrindadeActs
      .concat(normalizedJulyDocumentNews)
      .concat(normalizedControlNews)
      .map(applyEditorialCuration)
      .filter((item) => item.recordType === "story" && Number(item.year) === editorialYear)
  ).slice(0, 8);
  const julyPublishedNews = sortForSearch(
    dedupeById(
      normalizedJulyDocumentNews.concat(
        normalizedTrindadeActs.filter((item) => item.month === "2026-07" && item.recordType === "story")
      )
    ).map(applyEditorialCuration)
  );

  const sourceCards = Object.values(sourceLibrary).map((entry) =>
    sourceCardFromLibrary(
      entry,
      stateRecords.filter((item) => item.sourceFamily === entry.label).length
    )
  );
  sourceCards.push({
    id: "trindade",
    label: "Trindade | Portal integrado",
    officialUrl: "https://www.diariomunicipal.com.br/agm/",
    analysisFocus: "atos do Diario, atividade legislativa, contratos da Camara, decisoes do TCM e base de empresas conectadas.",
    materialTypes: "atos publicos, noticias verificadas, proposicoes, contratos, credores e processos do TCM.",
    nextStep: "continuar a expandir os recortes historicos e manter a busca unificada leve no celular.",
    stateCount: trindadeStatus.source_counts?.unified_search_records || 0
  });
  sourceCards.push({
    id: "alego",
    label: "ALEGO | Diário, votações e contratos",
    officialUrl: "https://transparencia.al.go.leg.br/",
    analysisFocus: "Diário da Assembleia, votações nominais, contratos, aditivos e sanções administrativas.",
    materialTypes: "atos legislativos, votos individualizados, contratos, valores empenhados e pagos.",
    nextStep: "ler os PDFs ato a ato e promover os fatos de maior impacto para a capa.",
    stateCount: Number(alegoMonitor.summary?.diary_editions || 0)
      + Number(alegoMonitor.summary?.roll_calls || 0)
      + Number(alegoMonitor.summary?.contracts || 0)
      + normalizedJulyDocumentNews.filter((item) => item.sourceFamily?.includes("Assembleia")).length
  });

  const cityCounts = countBy(
    allRecords.filter((item) => item.city),
    (item) => item.city
  ).slice(0, 8);

  const cityFocus = cityCounts.map((item) => {
    const meta = municipalityByName.get(normalizeText(item.label));
    return {
      city: item.label,
      count: item.count,
      diaryFamily: meta?.diary_family || (item.label === "Trindade" ? "Trindade | Base integrada" : "Cobertura especial"),
      diaryUrl: meta?.diary_url || null,
      note: meta?.note || (item.label === "Trindade" ? "Base integrada com atos, noticias e rastros publicos." : ""),
      loadedEntriesTotal: meta?.loaded_entries_total || item.count
    };
  });

  const yearCounts = countBy(
    allRecords.filter((item) => item.year),
    (item) => String(item.year)
  ).sort((a, b) => Number(b.label) - Number(a.label));

  const latestYear = yearCounts[0]?.label || null;
  const loadedCities = new Set(allRecords.map((item) => item.city).filter(Boolean)).size;
  const stateCities = new Set(stateRecords.map((item) => item.city).filter(Boolean)).size;
  const yearSnapshots = yearCounts.slice(0, 6).map((bucket) => {
    const items = allRecords.filter((item) => String(item.year || "") === bucket.label);
    return {
      year: bucket.label,
      count: bucket.count,
      href: `/busca/?year=${bucket.label}`,
      lead: rankFrontPageStories(items.filter((item) => item.recordType === "story")).at(0) || null,
      cities: countBy(items.filter((item) => item.city), (item) => item.city).slice(0, 3)
    };
  });

  const searchFilters = {
    years: yearCounts,
    cities: countBy(allRecords.filter((item) => item.city), (item) => item.city).slice(0, 32),
    types: countBy(allRecords.filter((item) => item.type), (item) => item.type).slice(0, 24),
    families: countBy(allRecords.filter((item) => item.sourceFamily), (item) => item.sourceFamily).slice(0, 20),
    editorias: countBy(allRecords.filter((item) => item.editoria), (item) => item.editoria).slice(0, 24)
  };

  const stateEditorialSections = countBy(
    stateRecords.filter((item) => item.editoria),
    (item) => item.editoria
  )
    .slice(0, 4)
    .map((bucket) => ({
      label: bucket.label,
      items: sortForSearch(stateRecords.filter((item) => item.editoria === bucket.label)).slice(0, 3)
    }));

  const monthlyActs = Object.entries(trindadeAnalysis.monthly || {})
    .map(([month, counts]) => ({
      month,
      total: Object.values(counts || {}).reduce((total, value) => total + Number(value || 0), 0),
      topType: Object.entries(counts || {}).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] || null
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const siteData = {
    metadata: {
      brand: radar.project_name,
      title: radar.site_title,
      updatedAt: editorialPublicationDate,
      cutoffDate: [radar.cutoff_date, julyDocumentNews.period?.to].filter(Boolean).sort().at(-1),
      remoteUrl: radar.remote_url,
      yearsOpen: radar.archive_years || []
    },
    metrics: {
      records: allRecords.length,
      curatedStories: publishedNews.length,
      publishedOfficialStories: publishedNews.length,
      currentYearStories: timelineNews.length,
      julyStories: julyPublishedNews.length,
      julyPdfs: Number(julyDocumentNews.summary?.pdfs || 0),
      julyPages: Number(julyDocumentNews.summary?.pages || 0),
      currentYear: editorialYear,
      repositoryRecords: allRecords.length,
      routineRecordsArchived: normalizedTrindadeActs.filter((item) => item.recordType !== "story").length
        + normalizedTcmNews.filter((item) => item.recordType !== "story").length,
      excludedInstitutionalNews: (radar.entries || []).filter((item) => !isPrimaryOfficialSource(item)).length
        + trindadeNews.filter((item) => !hasPrimarySource(item)).length,
      trindadeActs: normalizedTrindadeActs.length,
      tcmStories: normalizedTcmNews.filter((item) => item.recordType === "story").length
        + normalizedControlNews.filter((item) => item.sourceFamily?.includes("TCM-GO")).length,
      tcmDocuments: normalizedTcmNews.length,
      controlStories: normalizedControlNews.length,
      tceStories: normalizedControlNews.filter((item) => item.sourceFamily?.includes("TCE-GO")).length,
      consultedSources: sourceCards.length,
      pagesReviewed: trindadeCoverage.pages || 0,
      municipalities: coverage.summary?.municipalities_total || radar.coverage_goal?.municipalities_total || 0,
      loadedCities,
      stateCities,
      evaluatedUnits: radar.evaluated_units || 0
    },
    leadStory,
    heroSidebar,
    controlFront,
    timeline: {
      year: editorialYear,
      total: timelineNews.length,
      stories: timelineNews.slice(0, 60)
    },
    july: {
      month: "2026-07",
      through: julyDocumentNews.period?.to || null,
      total: julyPublishedNews.length,
      pdfs: Number(julyDocumentNews.summary?.pdfs || 0),
      pages: Number(julyDocumentNews.summary?.pages || 0),
      bySource: countBy(julyPublishedNews, (item) => item.sourceFamily),
      byCity: countBy(julyPublishedNews, (item) => item.city),
      byType: countBy(julyPublishedNews, (item) => item.type),
      stories: julyPublishedNews.slice(0, 36)
    },
    stateFront,
    trindadeFront,
    actsFront,
    stateEditorialSections,
    sourceCards,
    cityFocus,
    yearCounts,
    latestYear,
    yearSnapshots,
    searchFilters,
    analysisStack: radar.analysis_stack || [],
    expansionQueue: radar.expansion_queue || [],
    archiveYears: radar.archive_years || [],
    coverageGoal: radar.coverage_goal || {},
    textExport: {
      label: radar.text_export?.label || "Caderno TXT",
      href: "/downloads/pauteiro-2026-pautas.txt"
    },
    trindadeStats: {
      coverage: trindadeCoverage,
      status: trindadeStatus,
      analysis: {
        acts: trindadeAnalysis.acts,
        procurementRecords: trindadeAnalysis.procurement_records,
        publicBodies: trindadeAnalysis.public_bodies,
        companies: trindadeAnalysis.companies,
        people: trindadeAnalysis.people,
        alertsForReview: trindadeAnalysis.alerts_for_review
      },
      monthlyActs: monthlyActs.slice(0, 12),
      actsByType: Object.entries(trindadeAnalysis.acts_by_type || {})
        .map(([label, count]) => ({ label: titleCase(label), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      chamberSummary: trindadeCamara.summary || {},
      legislativeSummary: trindadeLegislative.summary || {},
      tcmTotal: normalizedTcmNews.length
    },
    municipalitySummary: coverage.summary || {},
    priorityMunicipalities: (coverage.municipality_catalog || []).filter((item) => item.priority).slice(0, 12),
    municipalDiaries: {
      generatedAt: municipalDiaries.generated_at || null,
      range: municipalDiaries.range || {},
      summary: municipalDiaries.summary || {},
      dailyCheckWindows: municipalDiaries.daily_check_windows || [],
      sources: (municipalDiaries.sources || []).map((source) => ({
        id: source.id,
        name: source.name,
        officialUrl: source.official_url,
        municipalities: source.municipalities || [],
        status: source.status,
        warning: source.source_warning || null,
        checkedAt: source.checked_at,
        publicationPattern: source.publication_pattern || {},
        summary: source.summary || {}
      }))
    },
    alego: {
      generatedAt: alegoMonitor.generated_at || null,
      range: alegoMonitor.range || {},
      summary: alegoMonitor.summary || {},
      dailyCheckWindows: alegoMonitor.daily_check_windows || [],
      sources: (alegoMonitor.sources || []).map((source) => ({
        id: source.id,
        name: source.name,
        officialUrl: source.official_url,
        status: source.status,
        collectionMethod: source.collection_method,
        publicationPattern: source.publication_pattern || {},
        summary: source.summary || {}
      })),
      analysisQueue: (alegoMonitor.analysis_queue || []).slice(0, 12)
    }
  };

  const searchPayload = {
    generatedAt: editorialPublicationDate || trindadeStatus.generated_at,
    total: allRecords.length,
    filters: searchFilters,
    records: allRecords.map(buildSearchRecord)
  };

  const julyNewsIndex = {
    generatedAt: julyDocumentNews.generated_at || searchPayload.generatedAt,
    month: "2026-07",
    total: julyPublishedNews.length,
    records: julyPublishedNews.map((item) => ({
      id: item.id,
      path: item.path,
      date: item.date,
      city: item.city,
      type: item.type,
      title: item.title,
      deck: trimText(item.deck, 240),
      sourceFamily: item.sourceFamily,
      sourceNote: item.sourceNote,
      importance: item.importance,
      prominence: item.prominence || "archive"
    }))
  };

  const searchManifest = {
    generatedAt: searchPayload.generatedAt,
    total: allRecords.length,
    defaultYear: latestYear,
    filters: searchFilters,
    shards: yearCounts.map((item) => ({
      id: item.label,
      label: item.label,
      count: item.count,
      file: `year-${item.label}.json`
    })),
    allFile: "site-search.json"
  };

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(publicDataDir, { recursive: true });
  await fs.mkdir(publicDownloadsDir, { recursive: true });
  await fs.mkdir(publicSearchDir, { recursive: true });

  await fs.writeFile(
    path.join(generatedDir, "site-data.json"),
    JSON.stringify(siteData, null, 2)
  );
  await fs.writeFile(
    path.join(generatedDir, "site-records.json"),
    JSON.stringify(allRecords, null, 2)
  );
  await fs.writeFile(
    path.join(publicDataDir, "site-search.json"),
    JSON.stringify(searchPayload)
  );
  await fs.writeFile(
    path.join(publicDataDir, "site-search-manifest.json"),
    JSON.stringify(searchManifest)
  );
  await fs.writeFile(
    path.join(publicDataDir, "site-summary.json"),
    JSON.stringify(siteData)
  );
  await fs.writeFile(
    path.join(publicDataDir, "july-news-index.json"),
    JSON.stringify(julyNewsIndex)
  );
  for (const shard of searchManifest.shards) {
    const shardPayload = {
      generatedAt: searchPayload.generatedAt,
      total: searchPayload.records.filter((item) => String(item.year || "") === shard.id).length,
      year: shard.id,
      records: searchPayload.records.filter((item) => String(item.year || "") === shard.id)
    };
    await fs.writeFile(
      path.join(publicSearchDir, shard.file),
      JSON.stringify(shardPayload)
    );
  }
  await fs.copyFile(
    path.join(root, "pauteiro-2026-pautas.txt"),
    path.join(publicDownloadsDir, "pauteiro-2026-pautas.txt")
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
