const DAY_IN_MS = 24 * 60 * 60 * 1000;

const PROMINENCE_WEIGHT = Object.freeze({
  cover: 60,
  section: 20,
  archive: 0,
  repository: -40
});

const PUBLICATION_WEIGHT = Object.freeze({
  curated_document_news: 35,
  edited_document_news: 15,
  automatic_document_news: 0
});

function dateInMs(value) {
  const parsed = Date.parse(`${String(value || "").slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cityKey(item) {
  return String(item?.city || "").trim().toLocaleLowerCase("pt-BR");
}

export function frontPageScore(item, latestDate) {
  const latest = dateInMs(latestDate);
  const published = dateInMs(item?.date);
  const ageInDays = latest && published
    ? Math.max(0, Math.round((latest - published) / DAY_IN_MS))
    : 0;
  const importance = Math.max(0, Number(item?.importance) || 0);
  const prominence = PROMINENCE_WEIGHT[item?.prominence] || 0;
  const publication = PUBLICATION_WEIGHT[item?.publicationMode] || 0;
  const originalDocumentImage = item?.image?.kind === "source-page" ? 10 : 0;

  return (importance * 10) + prominence + publication + originalDocumentImage - (ageInDays * 20);
}

export function rankFrontPageStories(items = []) {
  const eligible = items.filter((item) => item?.recordType === "story" && item?.date);
  const latestDate = eligible.reduce(
    (latest, item) => String(item.date) > latest ? String(item.date) : latest,
    ""
  );

  return [...eligible].sort((a, b) => {
    const scoreDifference = frontPageScore(b, latestDate) - frontPageScore(a, latestDate);
    if (scoreDifference !== 0) return scoreDifference;

    const dateDifference = String(b.date || "").localeCompare(String(a.date || ""));
    if (dateDifference !== 0) return dateDifference;

    const importanceDifference = (Number(b.importance) || 0) - (Number(a.importance) || 0);
    if (importanceDifference !== 0) return importanceDifference;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function buildFrontPagePackage(items = [], { sidebarSize = 3 } = {}) {
  const ranked = rankFrontPageStories(items);
  const lead = ranked.at(0) || null;
  const remaining = ranked.slice(1);
  const sidebar = [];
  const usedCities = new Set(lead ? [cityKey(lead)] : []);

  for (const item of remaining) {
    if (sidebar.length >= sidebarSize) break;
    const key = cityKey(item);
    if (key && usedCities.has(key)) continue;
    sidebar.push(item);
    if (key) usedCities.add(key);
  }

  for (const item of remaining) {
    if (sidebar.length >= sidebarSize) break;
    if (!sidebar.some((selected) => selected.id === item.id)) sidebar.push(item);
  }

  return { lead, sidebar, ranked };
}
