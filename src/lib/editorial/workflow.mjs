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
  "arquivada"
]);

export const PUBLICATION_ADAPTER = Object.freeze({
  status: "disabled",
  automaticPublishing: false,
  supportedTargets: []
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

export function canTransition({ from, to, story, review } = {}) {
  if (!EDITORIAL_STATES.includes(from) || !EDITORIAL_STATES.includes(to)) {
    return { allowed: false, issues: ["estado_editorial_invalido"] };
  }
  if (to === "aprovada") return validateApprovalGate({ story, review });
  return { allowed: true, issues: [] };
}

