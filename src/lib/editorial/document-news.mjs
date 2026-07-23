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
  recomendacao_emitida: "recomendação à gestão",
  proposta_tecnica_de_irregularidade_e_multa: "proposta técnica de irregularidade e multa",
  abertura_de_vista_ou_defesa: "abertura de prazo para defesa",
  contas_com_parecer_pela_aprovacao: "parecer pela aprovação das contas",
  contas_julgadas_regulares: "julgamento regular das contas",
  ato_considerado_legal_e_registrado: "registro de legalidade do ato",
  arquivamento_determinado: "arquivamento do processo",
  medida_cautelar_indeferida: "indeferimento de medida cautelar",
  medida_cautelar_revogada: "revogação de medida cautelar",
  processo_extinto_sem_julgamento_de_merito: "extinção sem julgamento de mérito",
  autorizacao_emitida: "autorização administrativa",
  processo_extinto: "extinção do processo",
  nao_classificado: "novo andamento"
});

const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, value));

const actBaseScore = Object.freeze({
  contrato: 76,
  extrato_de_contrato: 74,
  convenio: 72,
  dispensa: 70,
  inexigibilidade: 70,
  aviso_de_licitacao: 68,
  rescisao: 66,
  aditivo: 62,
  apostilamento: 56,
  lei: 60,
  lei_complementar: 65,
  edital: 48,
  homologacao: 52,
  notificacao: 45,
  resolucao: 44,
  decreto: 32,
  nomeacao: 30,
  exoneracao: 30,
  convocacao: 28,
  portaria: 16,
  errata: 10,
  manual_review_required: 0
});

export function assessActNewsValue(item = {}, valueTotal = 0) {
  const normalizedType = normalize(clean(item.act_type) || "ato").replaceAll(" ", "_");
  const text = normalize([item.title, item.summary, item.public_body, ...(item.reference_numbers || [])].join(" "));
  const reasons = [];
  let score = actBaseScore[normalizedType] ?? 25;

  if (/(contrato|licitacao|dispensa|inexigibilidade|convenio|aditivo|apostilamento|rescisao)/.test(normalizedType)) {
    reasons.push("uso de recursos ou contratação pública");
  }
  if (valueTotal > 0) {
    score += valueTotal >= 1_000_000 ? 25 : valueTotal >= 100_000 ? 20 : valueTotal >= 10_000 ? 15 : 10;
    reasons.push("valor financeiro identificado");
  }
  if ((item.cnpjs || []).length) {
    score += 6;
    reasons.push("empresa ou CNPJ identificado");
  }
  if (/(obra|saude|educacao|medicamento|transporte|saneamento|energia|tecnologia|imovel|concurso|chamamento|orcamento|credito suplementar|desapropriacao|tribut|tarifa|repasse|festival|show)/.test(text)) {
    score += 18;
    reasons.push("impacto potencial em serviço, política ou patrimônio público");
  }
  if (/(multa|irregular|correcao|determinacao|rejeicao|prestacao de contas|ressarcimento|debito)/.test(text)) {
    score += 25;
    reasons.push("controle, correção ou responsabilização");
  }
  if (/(secretario municipal|chefe de gabinete|procurador geral|controlador geral|presidente de autarquia)/.test(text)
      && /(nomeacao|exoneracao)/.test(normalizedType)) {
    score += 22;
    reasons.push("mudança em cargo estratégico");
  }
  if (/(diaria|ferias|licenca|deslocamento|ponto facultativo|feriado|substituicao temporaria|horario de expediente)/.test(text)) {
    score -= 38;
    reasons.push("rotina administrativa sem impacto amplo identificado");
  }
  if (/consulte o documento oficial para o conteudo integral/.test(text)) score -= 14;
  if (normalizedType === "manual_review_required") score = 0;

  score = clamp(score);
  return {
    score,
    tier: score >= 85 ? "alta_relevancia" : score >= 60 ? "relevante" : score >= 40 ? "monitoramento" : "repositorio",
    publish: score >= 60,
    reasons: [...new Set(reasons)]
  };
}

export function assessTcmNewsValue(dossier = {}, latest = {}) {
  const result = normalize(latest.result || dossier.current_result).replaceAll(" ", "_");
  const text = normalize([result, dossier.analysis_summary, latest.analysis_summary, ...(dossier.review_reasons || [])].join(" "));
  const reasons = [];
  let score = 28;

  if (/(irregular|rejeitad|multa|debito|ressarcimento|imputacao|proposta_tecnica_de_irregularidade)/.test(text)) {
    score = 92;
    reasons.push("possível responsabilização ou dano ao erário registrado pelo controle externo");
  } else if (/(cautelar|determinacao|recomendacao|correcao|alerta)/.test(text)) {
    score = 74;
    reasons.push("medida de controle com efeito sobre a gestão");
  } else if (/(ressalva|abertura_de_vista|defesa)/.test(text)) {
    score = 56;
    reasons.push("processo relevante ainda em andamento");
  } else if (/(regular|legal_e_registrado|aprovacao|arquivamento|extinto)/.test(text)) {
    score = 30;
    reasons.push("resultado de rotina sem sanção ou correção identificada");
  }

  if ((dossier.amounts || []).length) {
    score += 8;
    reasons.push("valor financeiro identificado na decisão");
  }
  if (/confirmada/.test(normalize(dossier.fine_status)) || /confirmad/.test(normalize(dossier.debit_status))) score += 8;
  score = clamp(score);
  return {
    score,
    tier: score >= 85 ? "alta_relevancia" : score >= 60 ? "relevante" : score >= 45 ? "monitoramento" : "repositorio",
    publish: score >= 60,
    reasons: [...new Set(reasons)]
  };
}

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

function truncateHeadline(value, limit = 148) {
  const text = clean(value);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function headlineValue(value) {
  if (!value) return "";
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${value >= 2_000_000 ? "milhões" : "milhão"}`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function humanizePurpose(value) {
  let text = clean(value).replace(/\s+\p{L}$/u, "");
  const letters = text.match(/\p{L}/gu) || [];
  const uppercase = text.match(/\p{Lu}/gu) || [];
  if (letters.length > 10 && uppercase.length / letters.length > 0.68) {
    text = text.toLocaleLowerCase("pt-BR");
    text = `${text.charAt(0).toLocaleUpperCase("pt-BR")}${text.slice(1)}`;
    text = text.replace(/\b(cantor(?:a)?|banda|dupla)\s+([^,.;]+?)(?=\s+(?:durante|para|a ser|no|na)\b|[,.;]|$)/giu, (_, role, name) => {
      const properName = name.split(/\s+/).map((word) => /^(?:da|de|do|das|dos|e)$/i.test(word)
        ? word.toLocaleLowerCase("pt-BR")
        : `${word.charAt(0).toLocaleUpperCase("pt-BR")}${word.slice(1)}`).join(" ");
      return `${role.toLocaleLowerCase("pt-BR")} ${properName}`;
    });
    text = text.replace(/\b(cnpj|cpf|sus|upa|ubs|arp|saas)\b/giu, (term) => term.toLocaleUpperCase("pt-BR"));
  }
  if (text.lastIndexOf("(") > text.lastIndexOf(")")) text = text.slice(0, text.lastIndexOf("(")).trim();
  text = text.replace(/\btrindade\b/giu, "Trindade");
  return text;
}

function purposeFromSummary(summary) {
  const text = clean(summary).replace(/[.;]+$/, "");
  if (!text || /consulte o documento oficial para o conteudo integral/i.test(normalize(text))) return "";
  const purpose = text.match(/\b(?:para|visando)(?:\s+(?:a|o|ao|à))?\s+(.+)/i)?.[1] || "";
  return humanizePurpose(purpose.split(/(?<=[.!?;])\s/)[0]);
}

function headlineFromAct(item, valueTotal) {
  const officialTitle = clean(item.title) || "Ato oficial";
  const summary = clean(item.summary);
  const type = normalize(item.act_type).replaceAll(" ", "_");
  const typeLabels = {
    contrato: "contrato",
    extrato_de_contrato: "contrato",
    convenio: "convênio",
    dispensa: "dispensa de licitação",
    inexigibilidade: "contratação direta",
    aviso_de_licitacao: "licitação",
    rescisao: "rescisão contratual",
    aditivo: "aditivo contratual",
    apostilamento: "apostilamento",
    edital: "edital",
    lei: "lei",
    lei_complementar: "lei complementar"
  };
  const label = typeLabels[type];
  const reference = /(contrato|convenio|dispensa|inexigibilidade|licitacao|aditivo|apostilamento|rescisao|edital)/.test(normalize(officialTitle))
    ? officialTitle.match(/\bN[º°.]?\s*[\d./-]+/i)?.[0] || ""
    : "";
  const value = headlineValue(valueTotal);
  const purpose = purposeFromSummary(summary);

  if (label && /(contrato|convenio|dispensa|inexigibilidade|licitacao|rescisao|aditivo|apostilamento)/.test(type)) {
    const core = `Trindade publica ${label}${reference ? ` ${reference}` : ""}${value ? ` de ${value}` : ""}`;
    return truncateHeadline(purpose ? `${core} para ${lowerFirst(purpose)}` : `${core}: ${summary || officialTitle}`);
  }
  if (!summary || normalize(summary) === normalize(officialTitle)) return truncateHeadline(`Trindade publica ${officialTitle}`);
  const subject = summary
    .replace(/^dispõe sobre\s+/i, "")
    .replace(/^dispõe acerca de\s+/i, "")
    .replace(/^torna público\s+/i, "")
    .replace(/[.;]+$/, "");
  if (/^(portaria|decreto|lei|edital|resolu[cç][aã]o|aviso|extrato|termo)/i.test(officialTitle)) {
    return truncateHeadline(`Trindade publica ${officialTitle}: ${lowerFirst(subject)}`);
  }
  return truncateHeadline(`${officialTitle}: ${summary.replace(/[.;]+$/, "")}`);
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
    title: headlineFromAct(item, valueTotal),
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
