import { courtId, isAlego } from './control-coverage.mjs';
const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalize = (value) => clean(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const controlPattern = /multa|sanc|irregular|correc|determin|ressarc|debito|rejei|cautelar|prestacao de contas/i;
const publicImpactPattern = /saude|educa|obra|transporte|saneamento|habitacao|tribut|tarifa|credito|orcamento|patrimonio|imovel|medicamento|seguranca/i;
const sensitivePattern = /multa|sanc|irregular|crime|fraude|corrup|investiga|acus|ressarc|debito|rejei|pessoa identific/i;

export const CURATION_POLICY = Object.freeze({
  schemaVersion: 1,
  promptVersion: "pauteiro-curadoria-v1",
  minimumScore: 85,
  localMinimumScore: 75,
  controlMinimumScore: 70,
  maximumPerDate: 12,
  reservedPerCourtPerDate: 2,
  maximumPerRun: 240,
  automationBatchSize: 12,
  publishableStatuses: ["approved"],
  reviewStatuses: ["needs_review"],
  modelRole: "ChatGPT propõe curadoria; somente itens approved entram no pacote público"
});

export function evaluateCurationCandidate(item = {}, policy = CURATION_POLICY) {
  const score = Number(item.importance ?? item.news_value?.score ?? 0);
  const text = normalize([
    item.official_title,
    item.title,
    item.deck,
    item.summary,
    item.evidence_excerpt,
    item.public_body,
    ...(item.paragraphs || []),
    ...(item.news_value?.reasons || [])
  ].filter(Boolean).join(" "));
  const reasons = [];
  const court = courtId(item);

  if (score >= policy.minimumScore) reasons.push("alto valor-notícia calculado");
  if (normalize(item.city) === "trindade" && score >= policy.localMinimumScore) {
    reasons.push("impacto direto em Trindade");
  }
  if (controlPattern.test(text) && score >= policy.controlMinimumScore) {
    reasons.push("controle, correção ou responsabilização");
  }
  if (court && controlPattern.test(text)) reasons.push('ato de tribunal de contas para leitura e revisão');
  if (publicImpactPattern.test(text) && score >= policy.localMinimumScore) {
    reasons.push("possível impacto em serviço, política ou patrimônio público");
  }

  const sourceUrl = clean(item.official_url || item.source_landing_url);
  const hasOfficialSource = /^https?:\/\//i.test(sourceUrl);
  const hasEvidence = Boolean(clean(item.evidence_excerpt) || (item.paragraphs || []).some(clean));
  const eligible = !isAlego(item) && hasOfficialSource && hasEvidence && reasons.length > 0;

  return {
    eligible,
    score,
    priority: Math.min(100, Math.max(score, court && controlPattern.test(text) ? policy.controlMinimumScore : 0)
      + (normalize(item.city) === "trindade" ? 4 : 0)
      + (controlPattern.test(text) ? 4 : 0)),
    reasons: [...new Set(reasons)],
    mandatoryHumanReview: Boolean(court) || sensitivePattern.test(text),
    issues: [
      !hasOfficialSource ? "fonte_oficial_ausente" : null,
      !hasEvidence ? "trecho_de_evidencia_ausente" : null
    ].filter(Boolean)
  };
}

export function buildCurationCandidate(item = {}, existingBrief = null, policy = CURATION_POLICY) {
  const assessment = evaluateCurationCandidate(item, policy);
  return {
    id: item.id,
    status: existingBrief ? "brief_exists" : "pending",
    date: item.date,
    city: item.city,
    scope: item.scope,
    actType: item.act_type,
    typeLabel: item.type_label,
    priority: assessment.priority,
    importance: assessment.score,
    curationReasons: assessment.reasons,
    mandatoryHumanReview: assessment.mandatoryHumanReview,
    factPacket: {
      officialTitle: clean(item.official_title),
      extractedTitle: clean(item.title),
      extractedDeck: clean(item.deck),
      extractedParagraphs: (item.paragraphs || []).map(clean).filter(Boolean),
      evidenceExcerpt: clean(item.evidence_excerpt),
      publicBody: clean(item.public_body),
      values: item.values || [],
      cnpjs: item.cnpjs || [],
      referenceNumbers: item.reference_numbers || [],
      confidence: Number(item.confidence) || null
    },
    source: {
      id: courtId(item) || clean(item.source_id),
      name: clean(item.source_name),
      label: clean(item.source_label),
      url: clean(item.official_url || item.source_landing_url),
      editionId: clean(item.edition_id),
      editionNumber: clean(item.edition_number),
      pageStart: Number(item.page_start) || null,
      pageEnd: Number(item.page_end) || Number(item.page_start) || null,
      documentReference: clean(item.document_reference),
      documentSha256: clean(item.document_sha256),
      actSha256: clean(item.act_sha256)
    },
    requestedOutput: {
      kind: "editorial_brief",
      promptVersion: policy.promptVersion,
      publishAutomatically: false
    }
  };
}

export function selectCurationCandidates(items = [], existingBriefs = [], options = {}) {
  const policy = { ...CURATION_POLICY, ...options };
  const briefById = new Map(existingBriefs.map((brief) => [brief.id, brief]));
  const eligible = items
    .map((item) => ({ item, assessment: evaluateCurationCandidate(item, policy) }))
    .filter(({ assessment }) => assessment.eligible)
    .sort((a, b) =>
      String(b.item.date || "").localeCompare(String(a.item.date || ""))
      || b.assessment.priority - a.assessment.priority
      || String(a.item.id || "").localeCompare(String(b.item.id || ""))
    );

  const selected = [];
  for (const date of new Set(eligible.map(entry => clean(entry.item.date)))) {
    const day = eligible.filter(entry => clean(entry.item.date) === date);
    const reserved = ['tcmgo', 'tcego'].flatMap(id => day.filter(entry => courtId(entry.item) === id).slice(0, policy.reservedPerCourtPerDate));
    const chosen = [...new Set([...reserved, ...day])].slice(0, policy.maximumPerDate);
    chosen.sort((a, b) => b.assessment.priority - a.assessment.priority || String(a.item.id).localeCompare(String(b.item.id)));
    for (const entry of chosen) {
      if (selected.length >= policy.maximumPerRun) break;
      selected.push(buildCurationCandidate(entry.item, briefById.get(entry.item.id), policy));
    }
    if (selected.length >= policy.maximumPerRun) break;
  }
  return selected;
}

export function validateEditorialBrief(brief = {}) {
  const issues = [];
  if (brief.publicProjection === 1) {
    if (!clean(brief.id) || brief.status !== 'approved') issues.push('public_status');
    const p = brief.editorial?.publication;
    if (!clean(p?.title) || !clean(p?.deck) || !Array.isArray(p?.paragraphs) || p.paragraphs.length < 2) issues.push('public_text');
    if (!/^[a-f0-9]{64}$/.test(brief.source?.documentSha256 || '')) issues.push('source_hash');
    return {valid: issues.length === 0, issues};
  }
  if (!clean(brief.id)) issues.push("id");
  if (!["draft", "needs_review", "approved", "rejected"].includes(brief.status)) issues.push("status");
  if (!clean(brief.editorial?.mainAngle)) issues.push("angulo_principal");
  if (!clean(brief.editorial?.whyItMatters)) issues.push("por_que_importa");
  if (!Array.isArray(brief.editorial?.headlineOptions) || brief.editorial.headlineOptions.length < 2) {
    issues.push("opcoes_de_titulo");
  }
  if (!Array.isArray(brief.editorial?.reportingQuestions) || brief.editorial.reportingQuestions.length < 2) {
    issues.push("perguntas_de_apuracao");
  }
  if (!Array.isArray(brief.editorial?.verifiedFacts) || brief.editorial.verifiedFacts.length < 1) {
    issues.push("fatos_confirmados");
  }
  if (!Array.isArray(brief.editorial?.doNotState)) issues.push("limites_editoriais");
  const importance = brief.editorial?.publication?.importance;
  if (importance !== undefined && (!Number.isFinite(Number(importance)) || Number(importance) < 0 || Number(importance) > 100)) {
    issues.push("importance");
  }
  if (brief.editorial?.publication?.promoteToStory !== undefined
    && typeof brief.editorial.publication.promoteToStory !== "boolean") issues.push("promote_to_story");
  if (brief.editorial?.publication?.city !== undefined && clean(brief.editorial.publication.city).length < 3) issues.push("city");
  return { valid: issues.length === 0, issues };
}

export function applyCuration(record = {}, brief = null) {
  if (!brief || !CURATION_POLICY.publishableStatuses.includes(brief.status)) return record;
  const validation = validateEditorialBrief(brief);
  const sourceHashMatches = !brief.source?.documentSha256
    || !record.sourceHash
    || brief.source.documentSha256 === record.sourceHash;
  if (!validation.valid || !sourceHashMatches) return record;

  const publication = brief.editorial.publication || {};
  const curatedTitle = clean(publication.title)
    || clean(brief.editorial.headlineOptions?.[0])
    || clean(record.title);
  const curatedDeck = clean(publication.deck)
    || clean(brief.editorial.mainAngle)
    || clean(record.deck);
  const curatedParagraphs = Array.isArray(publication.paragraphs)
    ? publication.paragraphs.map(clean).filter(Boolean)
    : [];
  const hasPublicationText = curatedParagraphs.length >= 2;
  const requestedImportance = publication.importance === undefined ? NaN : Number(publication.importance);
  const promoteToStory = publication.promoteToStory === true && hasPublicationText && Boolean(record.sourceHash);

  return {
    ...record,
    city: clean(publication.city) || record.city,
    recordType: promoteToStory ? "story" : record.recordType,
    prominence: promoteToStory ? "section" : record.prominence,
    importance: Number.isFinite(requestedImportance) && requestedImportance >= 0 && requestedImportance <= 100
      ? requestedImportance
      : record.importance,
    title: curatedTitle,
    deck: curatedDeck,
    summary: hasPublicationText ? curatedParagraphs.join(" ") : record.summary,
    paragraphs: hasPublicationText ? curatedParagraphs : record.paragraphs,
    publicationMode: "curated_document_news",
    editorialStatus: "published",
    curation: {
      status: brief.status,
      promotedToStory: promoteToStory && brief.status === "approved",
      promptVersion: brief.promptVersion || CURATION_POLICY.promptVersion,
      appliedAutomatically: brief.status === "draft",
      approvedBy: clean(brief.humanReview?.approvedBy) || null,
      approvedAt: clean(brief.humanReview?.approvedAt) || null,
      mainAngle: clean(brief.editorial.mainAngle)
    }
  };
}

export const applyApprovedCuration = applyCuration;
