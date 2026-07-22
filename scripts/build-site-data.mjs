import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const generatedDir = path.join(root, "src", "generated");
const publicDataDir = path.join(root, "public", "data");
const publicDownloadsDir = path.join(root, "public", "downloads");
const publicSearchDir = path.join(publicDataDir, "search");
const trindadePortalUrl = "https://trindade-aberta.raphaelbezerra.chatgpt.site";

const importantActTypes = new Map([
  ["edital", 7],
  ["aviso_de_licitacao", 7],
  ["dispensa", 6],
  ["inexigibilidade", 6],
  ["extrato_de_contrato", 6],
  ["contrato", 6],
  ["rescisao", 5],
  ["aditivo", 5],
  ["apostilamento", 5],
  ["notificacao", 5],
  ["nomeacao", 5],
  ["exoneracao", 5],
  ["lei", 4],
  ["lei_complementar", 4],
  ["decreto", 4],
  ["convocacao", 4],
  ["portaria", 2]
]);

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

function sumValues(values) {
  return (values || []).reduce((total, item) => total + (Number(item?.value) || 0), 0);
}

function trimText(value, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function buildSearchText(record) {
  return normalizeText([
    record.title,
    trimText(record.deck, 120),
    trimText(record.summary, 72),
    record.city,
    record.type,
    record.editoria,
    record.sourceFamily,
    record.sourceLabel,
    ...(record.tags || []).slice(0, 4)
  ].join(" "));
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
    deck: trimText(item.deck, 112),
    sourceFamily: item.sourceFamily,
    marker: trimText(item.marker || item.sourceNote || "", 52),
    importance: item.importance,
    search: item.search
  };
}

function scoreByValue(total) {
  if (total >= 1000000) return 8;
  if (total >= 250000) return 6;
  if (total >= 100000) return 5;
  if (total >= 50000) return 4;
  if (total >= 10000) return 2;
  return 0;
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
  const title = entry.title;
  const line = entry.line || entry.deck || entry.summary || "";
  const summary = entry.summary || line;
  const sourceLabel = entry.source_label || context.label || "Fonte oficial";
  const sourceFamily = resolveSourceFamily(
    city,
    context.sourceId,
    sourceLabel,
    context.municipalityByName,
    context.sourceLibrary
  );
  const image = entry.image_url
    ? {
        src: entry.image_url,
        alt: title,
        credit: entry.image_credit || sourceLabel,
        kind: "remote"
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
    deck: line,
    summary,
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
    recordType: "story"
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
    paragraphs: item.paragraphs || []
  };
}

function normalizeTrindadeAct(item) {
  const totalValue = sumValues(item.values);
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
    title: item.title,
    deck: item.summary,
    summary: item.summary,
    editoria: item.public_body || "Trindade",
    sourceFamily: "Trindade | Diario Oficial",
    sourceLabel: item.public_body || "Prefeitura de Trindade",
    sourceUrl: item.source_url || null,
    sourceNote: `Edicao ${item.edition_number}${pageLabel ? ` · ${pageLabel}` : ""}`,
    scope: "Municipal",
    tags: [actType, item.public_body, ...(item.reference_numbers || [])].filter(Boolean),
    image: {
      src: "/assets/trindade/og.png",
      alt: item.title,
      credit: "Trindade em Dados",
      kind: "fallback"
    },
    marker: `Ed. ${item.edition_number}${pageLabel ? ` · ${pageLabel}` : ""}`,
    importance: 35 + (importantActTypes.get(actType) || 1) + scoreByValue(totalValue),
    hasOriginalSource: Boolean(item.source_url),
    recordType: "record",
    valueTotal: totalValue,
    pageStart: item.page_start || null,
    pageEnd: item.page_end || null
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
    sourceUrl: item.href ? `${trindadePortalUrl}${String(item.href).startsWith("/") ? "" : "/"}${item.href}` : trindadePortalUrl,
    sourceActionLabel: "Abrir no Portal Trindade",
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
    hasOriginalSource: Boolean(item.href),
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
    if ((b.importance || 0) !== (a.importance || 0)) return (b.importance || 0) - (a.importance || 0);
    return compareByDateDesc(a, b);
  });
}

function pickLead(items) {
  return [...items]
    .sort((a, b) => {
      const imageWeightA = a.image?.src ? 4 : 0;
      const imageWeightB = b.image?.src ? 4 : 0;
      if (imageWeightB !== imageWeightA) return imageWeightB - imageWeightA;
      return (b.importance || 0) - (a.importance || 0) || compareByDateDesc(a, b);
    })
    .at(0);
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
  const trindadeActsRaw = await readJson("data", "trindade", "agm-trindade-acts-search.json");
  const trindadeAnalysis = await readJson("data", "trindade", "agm-trindade-analysis-index.json");
  const trindadeCoverage = await readJson("data", "trindade", "agm-trindade-coverage.json");
  const trindadeStatus = await readJson("data", "trindade", "data-status.json");
  const trindadeNewsRaw = await readJson("data", "trindade", "news-2026.json");
  const trindadeUnified = await readJson("data", "trindade", "unified-search-index.json");
  const trindadeCamara = await readJson("data", "trindade", "camara-index.json");
  const trindadeLegislative = await readJson("data", "trindade", "camara-legislative-index.json");
  const tcmDecisions = await readJson("data", "trindade", "tcmgo-trindade-decisions.json");

  const municipalityByName = new Map(
    (coverage.municipality_catalog || []).map((item) => [normalizeText(item.name), item])
  );
  const sourceLibrary = archiveMeta.source_library || {};

  const archiveHighlights = [];
  for (const yearBucket of Object.values(archiveMeta.year_buckets || {})) {
    for (const source of Object.values(yearBucket.sources || {})) {
      if (!source?.manifest) continue;
      const sourceData = await readJson(...String(source.manifest).split("/"));
      for (const entry of sourceData.highlight_entries || []) {
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
    (radar.entries || []).map((entry) =>
      normalizeStateEntry(entry, {
        municipalityByName,
        sourceLibrary,
        sourceId: null,
        label: entry.source_label,
        note: entry.source_note
      })
    ).concat(archiveHighlights)
  );

  const trindadeNews = (trindadeNewsRaw.items || []).map(normalizeTrindadeNews);
  const trindadeActs = (trindadeActsRaw.acts || []).map(normalizeTrindadeAct);
  const trindadeActIds = new Set(trindadeActs.map((item) => item.id));
  const residualUnified = (trindadeUnified.records || [])
    .filter((item) => item.type !== "ato" && item.type !== "noticia" && !trindadeActIds.has(item.id))
    .map(normalizeUnifiedRecord);

  const allRecords = sortForSearch(
    dedupeById(
      stateRecords
        .concat(trindadeNews)
        .concat(trindadeActs)
        .concat(residualUnified)
        .map(attachSearch)
    )
  );

  const leadStory = pickLead(stateRecords.concat(trindadeNews));
  const heroSidebar = sortForSearch(
    stateRecords.concat(trindadeNews).filter((item) => item.id !== leadStory?.id)
  ).slice(0, 3);

  const stateFront = sortForSearch(stateRecords).slice(0, 8);
  const trindadeFront = sortForSearch(trindadeNews.concat(trindadeActs)).slice(0, 8);
  const actsFront = sortForSearch(
    trindadeActs.filter((item) => (importantActTypes.get(item.actCode) || 0) >= 4 || item.valueTotal > 0)
  ).slice(0, 8);

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
      lead: pickLead(items.filter((item) => item.recordType === "story")) || pickLead(items),
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
      updatedAt: radar.updated_at,
      cutoffDate: radar.cutoff_date,
      remoteUrl: radar.remote_url,
      yearsOpen: radar.archive_years || []
    },
    metrics: {
      records: allRecords.length,
      curatedStories: stateRecords.length + trindadeNews.length,
      trindadeActs: trindadeActs.length,
      consultedSources: sourceCards.length,
      pagesReviewed: trindadeCoverage.pages || 0,
      municipalities: coverage.summary?.municipalities_total || radar.coverage_goal?.municipalities_total || 0,
      loadedCities,
      stateCities,
      evaluatedUnits: radar.evaluated_units || 0
    },
    leadStory,
    heroSidebar,
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
      tcmTotal: tcmDecisions.total || 0
    },
    municipalitySummary: coverage.summary || {},
    priorityMunicipalities: (coverage.municipality_catalog || []).filter((item) => item.priority).slice(0, 12)
  };

  const searchPayload = {
    generatedAt: new Date().toISOString(),
    total: allRecords.length,
    filters: searchFilters,
    records: allRecords.map(buildSearchRecord)
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
