// Relevance selects documents for the newsroom. An editorial decision and
// reporting copy are required before one appears in the news pages.
export function isPublishedArticle(item) {
  const edited = item.publicationMode === "edited_document_news";
  const approved = item.publicationMode === "curated_document_news" && item.curation?.promotedToStory === true;
  return item.recordType === "story" && item.editorialStatus === "published" && (edited || approved)
    && item.sourceType === "official_document" && /^https?:\/\//i.test(item.sourceUrl || "")
    && Boolean(item.title?.trim() && item.deck?.trim())
    && Array.isArray(item.paragraphs)
    && new Set(item.paragraphs.filter(p => typeof p === "string").map(p => p.trim()).filter(Boolean)).size >= 2;
}

export function classifyPublication(item, withdrawn = false) {
  if (isPublishedArticle(item) || (item.recordType !== "story" && !withdrawn)) return item;
  return { ...item, recordType: "record", publicationMode: "repository_record",
    editorialStatus: "archived", prominence: "repository", reportingCandidate: true };
}

export function copiesDocumentBody(paragraphs, document) {
  const normalize = text => String(text || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
  const source = normalize([document.title, document.deck, ...(document.paragraphs || [])].join(" "));
  const body = paragraphs.map(normalize).filter(Boolean);
  return body.length > 0 && body.every(paragraph => source.includes(paragraph));
}
