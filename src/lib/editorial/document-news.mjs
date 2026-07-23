const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const normalize = (value) => clean(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[_-]+/g, " ")
  .toLowerCase();

const finish = (value) => {
  const text = clean(value).replace(/[;,:-]+$/, "");
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
};

const lowerFirst = (value) => {
  const text = clean(value);
  return text ? `${text.charAt(0).toLocaleLowerCase("pt-BR")}${text.slice(1)}` : "";
};

const datePtBr = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))) return clean(value);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
};

const joinNatural = (items) => {
  const values = [...new Set((items || []).map(clean).filter(Boolean))];
  if (values.length <= 1) return values[0] || "";
  return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
};

const resultLabels = Object.freeze({
  contas_rejeitadas: "rejeição de contas",
  contas_irregulares: "irregularidade nas contas",
  contas_regulares_com_ressalva: "aprovação das contas com ressalvas",
  contas_regulares: "aprovação das contas",
  multa_aplicada: "aplicação de multa",
  determinacao_emitida: "determinação do tribunal",
  abertura_de_vista_ou_defesa: "abertura de prazo para defesa",
  autorizacao_emitida: "autorização administrativa",
  processo_extinto: "extinção do processo",
  nao_classificado: "novo andamento"
});

export function isPrimaryOfficialSource(entry = {}) {
  const origin = normalize(entry.source_origin);
  const label = normalize(entry.source_label);
  const url = clean(entry.document_url || entry.source_url);
  if (!/^https?:\/\//i.test(url)) return false;
  if (["noticia institucional", "reportagem", "agencia de noticias"].some((term) => origin.includes(term))) return false;
  if (/\/(?:noticia|noticias|news|imprensa|agencia-de-noticias)(?:\/|\?|$)/i.test(url)) return false;
  if (["diario bruto", "ato espelhado", "ato publico", "documento oficial"].some((term) => origin.includes(term))) return true;
  return /(?:diario|diário|sileg|tcm|tce|doe|dom|djec|ses-go|ssp|secretaria da seguranca)/i.test(label)
    && /(?:diario|materia|download|legis|extrato|portaria|licitacao|contrato|decreto|edital|doc\/index)/i.test(url);
}

export function hasPrimarySource(newsItem = {}) {
  const sources = newsItem.sources || [];
  return sources.some((source) => source.kind !== "noticia-oficial" && /^https?:\/\//i.test(clean(source.url)));
}

function headlineFromAct(item) {
  const officialTitle = clean(item.title) || "Ato oficial";
  const summary = clean(item.summary);
  if (!summary || normalize(summary) === normalize(officialTitle)) return `${officialTitle} é publicado em Trindade`;
  const subject = summary
    .replace(/^dispõe sobre\s+/i, "")
    .replace(/^dispõe acerca de\s+/i, "")
    .replace(/^torna público\s+/i, "")
    .replace(/[.;]+$/, "");
  if (/^(portaria|decreto|lei|edital|resolu[cç][aã]o|aviso|extrato|termo)/i.test(officialTitle)) {
    return clean(`${officialTitle} trata de ${lowerFirst(subject)}`).slice(0, 156);
  }
  return clean(`${officialTitle}: ${summary.replace(/[.;]+$/, "")}`).slice(0, 156);
}

function actContext(item, valueTotal) {
  const type = normalize(item.act_type).replaceAll("_", " ");
  if (/(contrato|aditivo|apostilamento|inexigibilidade|dispensa)/.test(type)) {
    return valueTotal > 0
      ? "O valor citado corresponde ao instrumento publicado. Ele não equivale, por si só, ao total já empenhado, liquidado ou pago, etapas que precisam ser acompanhadas nos registros contábeis."
      : "A publicação formaliza uma etapa da contratação pública. Empenhos, liquidações, pagamentos, aditivos e eventual execução do objeto devem ser acompanhados em registros posteriores.";
  }
  if (/(licitacao|edital|chamamento|pregao)/.test(type)) {
    return "O ato abre ou registra uma etapa do procedimento administrativo. A publicação não significa que já houve contratação, execução do objeto ou pagamento ao futuro vencedor.";
  }
  if (/(nomeacao|exoneracao|designacao|portaria)/.test(type)) {
    return "Trata-se de ato administrativo de pessoal ou de organização interna. Alcance, vigência, nomes e funções devem ser lidos conforme o texto integral e eventuais atos posteriores.";
  }
  if (/(lei|decreto|resolucao|instrucao normativa)/.test(type)) {
    return "A norma passa a integrar o conjunto de atos municipais. Vigência, alcance e regras de transição dependem do texto integral e de eventuais regulamentações posteriores.";
  }
  return "O documento registra uma decisão administrativa oficial. Seus efeitos concretos e eventuais desdobramentos devem ser acompanhados em publicações e registros posteriores.";
}

export function buildActNews(item = {}) {
  const officialTitle = clean(item.title) || "Ato oficial";
  const summary = finish(item.summary || officialTitle);
  const body = clean(item.public_body) || "Município de Trindade";
  const pageStart = Number(item.page_start) || null;
  const pageEnd = Number(item.page_end) || pageStart;
  const pageLabel = pageStart
    ? pageEnd && pageEnd !== pageStart ? `páginas ${pageStart} a ${pageEnd}` : `página ${pageStart}`
    : "página não informada no índice";
  const valueTotal = (item.values || []).reduce((total, value) => total + (Number(value?.value) || 0), 0);
  const references = joinNatural(item.reference_numbers);
  const cnpjs = joinNatural(item.cnpjs);
  const facts = [
    references ? `O registro menciona ${references}.` : "",
    cnpjs ? `Os CNPJs preservados no índice são ${cnpjs}.` : ""
  ].filter(Boolean).join(" ");
  const lead = finish(`${body} publicou ${officialTitle} no Diário Oficial de ${datePtBr(item.edition_date)}. ${summary}`);
  const documentParagraph = finish(`A matéria consta na edição ${clean(item.edition_number) || "sem número informado"}, na ${pageLabel}. ${facts}`);
  return {
    title: headlineFromAct(item),
    deck: finish(`${summary} O ato aparece na edição ${clean(item.edition_number) || "sem número informado"}, ${pageLabel}.`),
    summary: lead,
    paragraphs: [lead, documentParagraph, actContext(item, valueTotal)],
    officialTitle,
    valueTotal,
    pageStart,
    pageEnd
  };
}

export function buildStateNews(entry = {}) {
  const lead = finish(entry.lead || entry.summary || entry.line || entry.title);
  const detail = finish(entry.summary && normalize(entry.summary) !== normalize(lead)
    ? entry.summary
    : entry.source_note || "O documento integra a rotina de acompanhamento de atos públicos do Pauteiro.");
  const reference = finish(`A apuração parte diretamente de ${entry.source_label || "fonte oficial"}. ${entry.page_marker || entry.source_note || "A íntegra permanece vinculada à matéria para conferência."}`);
  return {
    title: clean(entry.title),
    deck: finish(entry.sublead || entry.line || entry.summary),
    summary: lead,
    paragraphs: [lead, detail, reference]
  };
}

export function buildTcmNews(dossier = {}) {
  const latest = [...(dossier.timeline || [])].sort((a, b) => String(b.edition_date).localeCompare(String(a.edition_date)))[0] || {};
  const result = resultLabels[latest.result || dossier.current_result] || clean(latest.result || dossier.current_result).replaceAll("_", " ") || "novo andamento";
  const nature = joinNatural(dossier.natures) || clean(latest.nature) || "processo de controle externo";
  const body = joinNatural(dossier.bodies) || clean(latest.body) || "órgão municipal não informado";
  const period = joinNatural(dossier.periods) || clean(latest.period);
  const decision = [latest.decision_type, latest.decision_number].filter(Boolean).join(" ");
  const pages = joinNatural((latest.source?.pages || []).map((page) => `p. ${page}`));
  const lead = finish(`O TCM-GO publicou ${result} no processo ${dossier.process_number}, relacionado a ${body}${period ? ` no período ${period}` : ""}. O andamento mais recente do dossiê é de ${datePtBr(latest.edition_date || dossier.last_publication)}.`);
  const timeline = finish(`O processo trata de ${nature} e reúne ${Number(dossier.occurrence_count) || 1} publicação(ões) entre ${datePtBr(dossier.first_publication)} e ${datePtBr(dossier.last_publication)}. ${decision ? `O ato mais recente foi identificado como ${decision}.` : "O número do ato mais recente não foi identificado no índice."}`);
  const evidence = finish(`${latest.analysis_summary || dossier.analysis_summary || "A classificação foi produzida a partir do ato oficial."} ${pages ? `Os trechos usados estão em ${pages}.` : "As páginas devem ser conferidas no diário oficial de contas."}`);
  return {
    title: `TCM-GO registra ${result} no processo ${dossier.process_number} de Trindade`,
    deck: finish(`${nature} reúne ${Number(dossier.occurrence_count) || 1} publicação(ões) e tem andamento mais recente em ${datePtBr(dossier.last_publication)}.`),
    summary: lead,
    paragraphs: [lead, timeline, evidence],
    latest,
    result
  };
}
