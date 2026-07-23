export const EDITORIAL_STATES = Object.freeze([
  "detectada",
  "triagem",
  "em_apuracao",
  "aguardando_resposta",
  "pronta_para_redacao",
  "em_redacao",
  "em_edicao",
  "pendencia_editorial",
  "aprovada",
  "publicada",
  "arquivada"
]);

export const PUBLICATION_ADAPTER = Object.freeze({
  status: "active",
  automaticPublishing: true,
  supportedTargets: ["github_pages"],
  automaticSourceTypes: ["official_document"]
});

const sensitivePattern = /acusa|investiga|crime|fraude|corrup|irregular|punic|multa|sanc|controvers|pessoa identific/i;

export function requiresMandatoryHumanReview(story = {}) {
  if (story.revisaoHumanaObrigatoria === true) return true;
  return sensitivePattern.test([
    story.tituloEditorial,
    story.linhaFina,
    story.corpo,
    ...(story.temas || []),
    ...(story.tags || [])
  ].filter(Boolean).join(" "));
}

export function validateApprovalGate({ story = {}, review = {} } = {}) {
  const issues = [];
  if (!Array.isArray(story.fontes) || story.fontes.length === 0) issues.push("fontes_identificadas");
  if (!Array.isArray(story.documentosRelacionados) || story.documentosRelacionados.length === 0) issues.push("documentos_relacionados");
  if (!story.autor) issues.push("autoria");
  if (!story.editor) issues.push("editor");
  if (!Array.isArray(story.historicoAlteracoes) || story.historicoAlteracoes.length === 0) issues.push("historico_de_versoes");
  if (!Array.isArray(story.trechosIa)) issues.push("registro_de_ia");
  if (!review.responsavel || review.status !== "aprovada") issues.push("revisao_editorial");
  if (requiresMandatoryHumanReview(story) && review.revisaoHumanaObrigatoria !== true) issues.push("revisao_humana_obrigatoria");
  if (story.contraditorioAplicavel === true && !review.contraditorio) issues.push("contraditorio");
  return { allowed: issues.length === 0, issues };
}

export function validateAutomaticDocumentNews(story = {}) {
  const issues = [];
  if (story.publicationMode !== "automatic_document_news") issues.push("modo_documental_automatico");
  if (story.sourceType !== "official_document") issues.push("fonte_primaria_oficial");
  if (!/^https?:\/\//i.test(story.sourceUrl || "")) issues.push("url_da_fonte_oficial");
  if (!story.title && !story.tituloEditorial) issues.push("titulo");
  if (!story.deck && !story.linhaFina) issues.push("olho");
  if (!Array.isArray(story.paragraphs) || story.paragraphs.length < 2) issues.push("texto_jornalistico");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(story.date || "")) issues.push("data_do_ato");
  if (/\/(?:noticia|noticias|news|imprensa|agencia-de-noticias)(?:\/|\?|$)/i.test(story.sourceUrl || "")) {
    issues.push("reportagem_institucional_bloqueada");
  }
  return { allowed: issues.length === 0, issues };
}

export function canTransition({ from, to, story, review } = {}) {
  if (!EDITORIAL_STATES.includes(from) || !EDITORIAL_STATES.includes(to)) {
    return { allowed: false, issues: ["estado_editorial_invalido"] };
  }
  if (to === "publicada" && story?.publicationMode === "automatic_document_news") {
    return validateAutomaticDocumentNews(story);
  }
  if (to === "publicada" && from !== "aprovada") return { allowed: false, issues: ["aprovacao_editorial"] };
  if (to === "aprovada") return validateApprovalGate({ story, review });
  return { allowed: true, issues: [] };
}

