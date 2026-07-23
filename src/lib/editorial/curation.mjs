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
  maximumPerRun: 240,
  automationBatchSize: 12,
  approvedStatuses: ["approved"],
  draftStatuses: ["draft", "needs_review"],
  modelRole: "ChatGPT produz diretrizes; a aprovação editorial continua humana"
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
    ...(item.news_value?.reasons || [])
  ].filter(Boolean).join(" "));
  const reasons = [];

  if (score >= policy.minimumScore) reasons.push("alto valor-notícia calculado");
  if (normalize(item.city) === "trindade" && score >= policy.localMinimumScore) {
    reasons.push("impacto direto em Trindade");
  }
  if (controlPattern.test(text) && score >= policy.controlMinimumScore) {
    reasons.push("controle, correção ou responsabilização");
  }
  if (publicImpactPattern.test(text) && score >= policy.localMinimumScore) {
    reasons.push("possível impacto em serviço, política ou patrimônio público");
  }

  const sourceUrl = clean(item.official_url || item.source_landing_url);
  const hasOfficialSource = /^https?:\/\//i.test(sourceUrl);
  const hasEvidence = Boolean(clean(item.evidence_excerpt) || (item.paragraphs || []).some(clean));
  const eligible = hasOfficialSource && hasEvidence && reasons.length > 0;

  return {
    eligible,
    score,
    priority: Math.min(100, score
      + (normalize(item.city) === "trindade" ? 4 : 0)
      + (controlPattern.test(text) ? 4 : 0)),
    reasons: [...new Set(reasons)],
    mandatoryHumanReview: sensitivePattern.test(text),
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

  const perDate = new Map();
  const selected = [];
  for (const entry of eligible) {
    if (selected.length >= policy.maximumPerRun) break;
    const date = clean(entry.item.date) || "sem-data";
    const dateCount = perDate.get(date) || 0;
    if (dateCount >= policy.maximumPerDate) continue;
    perDate.set(date, dateCount + 1);
    selected.push(buildCurationCandidate(entry.item, briefById.get(entry.item.id), policy));
  }
  return selected;
}

export function validateEditorialBrief(brief = {}) {
  const issues = [];
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
  if (brief.status === "approved") {
    if (!clean(brief.humanReview?.approvedBy)) issues.push("aprovador_humano");
    if (!/^\d{4}-\d{2}-\d{2}/.test(clean(brief.humanReview?.approvedAt))) issues.push("data_de_aprovacao");
    if (!clean(brief.editorial?.publication?.title)) issues.push("titulo_publicavel");
    if (!clean(brief.editorial?.publication?.deck)) issues.push("olho_publicavel");
    if (!Array.isArray(brief.editorial?.publication?.paragraphs)
      || brief.editorial.publication.paragraphs.length < 2) {
      issues.push("texto_publicavel");
    }
  }
  return { valid: issues.length === 0, issues };
}

export function applyApprovedCuration(record = {}, brief = null) {
  if (!brief || brief.status !== "approved") return record;
  const validation = validateEditorialBrief(brief);
  const sourceHashMatches = !brief.source?.documentSha256
    || !record.sourceHash
    || brief.source.documentSha256 === record.sourceHash;
  if (!validation.valid || !sourceHashMatches) return record;

  const publication = brief.editorial.publication;
  return {
    ...record,
    title: clean(publication.title),
    deck: clean(publication.deck),
    summary: publication.paragraphs.map(clean).filter(Boolean).join(" "),
    paragraphs: publication.paragraphs.map(clean).filter(Boolean),
    publicationMode: "curated_document_news",
    editorialStatus: "published",
    curation: {
      status: "approved",
      promptVersion: brief.promptVersion || CURATION_POLICY.promptVersion,
      approvedBy: brief.humanReview.approvedBy,
      approvedAt: brief.humanReview.approvedAt,
      mainAngle: clean(brief.editorial.mainAngle)
    }
  };
}
