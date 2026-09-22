const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
  && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));

export function validateStoryEntry(entry = {}, original = null) {
  const issues = [];
  if (!["edit", "new"].includes(entry.kind)) issues.push("kind");
  if (!["draft", "published"].includes(entry.status)) issues.push("status");
  if (!clean(entry.id)) issues.push("id");
  if (entry.kind === "edit" && (!original || original.recordType !== "story")) issues.push("original_story");
  if (entry.kind === "new" && original && original.editorialEntryId !== entry.id) issues.push("duplicate_id");
  if (entry.status === "published") {
    if (clean(entry.title).length < 12 || clean(entry.title).length > 180) issues.push("title");
    if (clean(entry.deck).length < 20 || clean(entry.deck).length > 400) issues.push("deck");
    if (!Array.isArray(entry.paragraphs) || entry.paragraphs.filter((value) => clean(value).length >= 35).length < 2) issues.push("paragraphs");
    if (entry.kind === "new") {
      if (!validDate(entry.date)) issues.push("date");
      if (!clean(entry.city)) issues.push("city");
      if (!clean(entry.sourceLabel)) issues.push("source_label");
      if (!/^https:\/\//i.test(clean(entry.sourceUrl))) issues.push("source_url");
      if (!clean(entry.documentReference)) issues.push("document_reference");
    } else if (entry.sourceUrl && entry.sourceUrl !== original?.sourceUrl) {
      issues.push("source_url_changed");
    }
    if (entry.kind === "edit" && entry.sourceHash && original?.sourceHash && entry.sourceHash !== original.sourceHash) {
      issues.push("source_hash_changed");
    }
  }
  return { valid: issues.length === 0, issues };
}

export function applyStoryEntry(original, entry) {
  if (!entry || entry.kind !== "edit" || entry.status !== "published") return original;
  if (!validateStoryEntry(entry, original).valid) return original;
  const paragraphs = entry.paragraphs.map(clean).filter(Boolean);
  return {
    ...original,
    title: clean(entry.title),
    deck: clean(entry.deck),
    summary: paragraphs.join(" "),
    paragraphs,
    updatedAt: validDate(entry.updatedAt) ? entry.updatedAt : original.updatedAt,
    publicationMode: "edited_document_news",
    editorialStatus: "published",
    editorialEntryId: entry.id
  };
}

export function toNewStorySource(entry) {
  if (entry?.kind !== "new" || entry?.status !== "published" || !validateStoryEntry(entry).valid) return null;
  const paragraphs = entry.paragraphs.map(clean).filter(Boolean);
  return {
    id: clean(entry.id),
    city: clean(entry.city),
    date: entry.date,
    scope: clean(entry.scope) || "Municipal",
    source_id: "pauteiro",
    source_name: clean(entry.sourceLabel),
    source_label: clean(entry.sourceLabel),
    official_url: clean(entry.sourceUrl),
    document_reference: clean(entry.documentReference),
    document_sha256: clean(entry.sourceHash) || null,
    act_type: clean(entry.type) || "ato_publico",
    type_label: clean(entry.type) || "Ato público",
    public_body: clean(entry.publicBody) || clean(entry.sourceLabel),
    official_title: clean(entry.officialTitle) || clean(entry.title),
    title: clean(entry.title),
    deck: clean(entry.deck),
    summary: paragraphs.join(" "),
    paragraphs,
    importance: Math.max(0, Math.min(100, Number(entry.importance) || 80)),
    prominence: "section",
    publication_mode: "edited_document_news",
    editorial_status: "published",
    updated_at: validDate(entry.updatedAt) ? entry.updatedAt : entry.date
  };
}
