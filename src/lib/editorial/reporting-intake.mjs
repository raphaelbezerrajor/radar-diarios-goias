import { buildCurationCandidate } from "./curation.mjs";
import { courtId, isAlego } from "./control-coverage.mjs";

const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const essentialService = /\b(hospital|leitos?|uti|upa|samu|pacientes|medicamentos?|unidades? de saude|merenda|transporte escolar|escolas?|alunos|creches?|abastecimento|saneamento|agua potavel|rodovia|ponte|moradias?)\b/;
const concreteDecision = /cautelar|ressarcimento|imputacao de debito|suspende|determina(?:cao)?\b|interdita|suspensao (?:do|da|de) (?:contrato|obra|licitacao|concurso|servico)/;
const materialChange = /amplia|implantacao|construcao|reforma|emergencial|convenio|retomada|interrupcao|repasse|reajuste|rescisao|suspensao|prorrogacao/;
const routine = /\b(ferias|diarias?|licenca premio|licenca medica|folha de ponto)\b|(?:nomear|designar|designa|designacao).{0,80}(?:gestor|fiscal)|reparo de mobiliario|reforma de (?:cadeiras|mobiliario)/;
const highAmount = /\br\$\s*[\d.,]+\s*(?:milh(?:ao|oes)|bilh(?:ao|oes))\b|\br\$\s*\d{1,3}(?:\.\d{3}){2,}(?:,\d{2})?\b/;

export function candidateFromRecord(record, raw, brief) {
  const firstPage = record.pageStart || Number(record.documentReference?.match(/\bp\.\s*(\d+)/i)?.[1]) || null;
  const source = raw || {
    id: record.id, date: record.date, city: record.city, scope: record.scope, source_id: courtId(record),
    source_name: record.sourceFamily, source_label: record.sourceLabel, official_url: record.sourceUrl,
    document_reference: record.documentReference, document_sha256: record.sourceHash, act_sha256: record.actHash,
    page_start: firstPage, page_end: record.pageEnd, act_type: record.actCode || record.kind, type_label: record.type,
    official_title: record.officialTitle, title: record.title, deck: record.deck, paragraphs: record.paragraphs,
    importance: record.importance, news_value: record.newsValue
  };
  const entry = buildCurationCandidate(source, brief);
  entry.withdrawnFromSite = true;
  return entry;
}

export function routePitch(entry, {year, cutoff, handled, held}) {
  const facts = entry.factPacket;
  const subject = normalize([facts.officialTitle, facts.extractedTitle, facts.extractedDeck].join(" "));
  const context = normalize([facts.officialTitle, facts.extractedDeck, facts.evidenceExcerpt].join(" "));
  const actionable = concreteDecision.test(subject) && (Boolean(courtId({source_id:entry.source.id})) ||
    /interdita|suspende|suspensao (?:do|da|de) (?:contrato|obra|licitacao|concurso|servico)/.test(subject));
  const service = essentialService.test(subject.replace(/abastecimento de combustive(?:l|is)/g, ""));
  const change = materialChange.test(subject);
  const isolatedValue = facts.values?.length === 1 && Number(facts.values[0].value) >= 1_000_000;
  const amount = highAmount.test(context) || isolatedValue;
  const verifiedLocation = Boolean(entry.source.url && entry.source.documentSha256 && entry.source.pageStart);
  const current = Number(entry.date?.slice(0,4)) === year;
  const ageDays = (Date.parse(cutoff) - Date.parse(entry.date)) / 86_400_000;
  const recent = ageDays >= 0 && ageDays <= 60;
  const urgentService = service && /emergencial|interrupcao|suspensao do atendimento/.test(subject);
  const reasons = [];
  if (actionable) reasons.push("decisão com efeito a conferir no dispositivo");
  if (service) reasons.push("serviço de interesse direto da população");
  if (change) reasons.push("mudança de execução, prazo ou atendimento a verificar");
  if (amount) reasons.push("valor expressivo identificado na extração, sujeito à conferência do objeto e do estágio");
  if (verifiedLocation) reasons.push("documento preservado e página identificada");
  if (urgentService) reasons.push("possível efeito imediato na continuidade do serviço");
  const priority = Math.min(100, Math.round(Math.min(100,entry.importance || 0) * .2) +
    32 * actionable + 18 * service + 14 * change + 14 * amount + 6 * verifiedLocation + 5 * current + 6 * recent + 9 * urgentService);
  const blocked = held || isAlego({source_id:entry.source.id, source_name:entry.source.name}) || routine.test(subject);
  const investigate = current && verifiedLocation && !blocked && (actionable || (service && (change || amount)) || (change && amount));
  const routing = handled || entry.status === "brief_exists" ? "in_workflow" : investigate ? "investigate" : "watch";
  const status = routing === "in_workflow" ? (entry.status === "brief_exists" ? "brief_exists" : "handled")
    : investigate ? "pending" : "watch";
  return { ...entry, status, priority, routing, impactReasons: reasons };
}

export function reportingOrder(a, b) {
  const order = {investigate:0, watch:1, in_workflow:2};
  return order[a.routing] - order[b.routing] || b.priority - a.priority ||
    String(b.date).localeCompare(String(a.date)) || String(a.id).localeCompare(String(b.id));
}

export function nextReportingBatch(candidates, limit) {
  const acts = new Set();
  const next = [];
  for (const entry of candidates) {
    if (entry.routing !== "investigate" || entry.status !== "pending") continue;
    const key = entry.source.actSha256 || entry.id;
    if (acts.has(key)) continue;
    acts.add(key);
    next.push(entry.id);
    if (next.length === limit) break;
  }
  return next;
}
