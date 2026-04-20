(function () {
  var DATA = window.RADAR_GO_DATA;
  var root = document.getElementById("app");

  if (!DATA || !root) {
    return;
  }

  var MONTH_PAGE = "pauteiro.html";
  var MONTH_START = new Date(DATA.month + "-01T00:00:00");
  var CUTOFF = new Date(DATA.cutoff_date + "T00:00:00");
  var DAYS_IN_MONTH = new Date(MONTH_START.getFullYear(), MONTH_START.getMonth() + 1, 0).getDate();

  var entries = DATA.entries.slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if ((b.highlight_score || 0) !== (a.highlight_score || 0)) return (b.highlight_score || 0) - (a.highlight_score || 0);
    return a.title.localeCompare(b.title);
  });

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function entryId(entry) {
    return [
      entry.date,
      slugify(entry.city),
      slugify(entry.title).slice(0, 48)
    ].join("-");
  }

  entries.forEach(function (entry) {
    entry.entry_id = entry.entry_id || entryId(entry);
  });

  var entryMap = entries.reduce(function (acc, entry) {
    acc[entry.entry_id] = entry;
    return acc;
  }, {});

  var grouped = entries.reduce(function (acc, entry) {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function monthName(index) {
    return ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"][index];
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function weekdayName(date) {
    return ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"][date.getDay()];
  }

  function shortWeekday(date) {
    return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][date.getDay()];
  }

  function longDate(date) {
    return weekdayName(date) + ", " + date.getDate() + " de " + monthName(date.getMonth()) + " de " + date.getFullYear();
  }

  function dateText(day) {
    return DATA.month + "-" + String(day).padStart(2, "0");
  }

  function parseDate(value) {
    return new Date(value + "T00:00:00");
  }

  function chronologyUrl() {
    return MONTH_PAGE + "?view=chronology";
  }

  function dayUrl(value) {
    return MONTH_PAGE + "?view=day&data=" + encodeURIComponent(value);
  }

  function storyUrl(entry) {
    return MONTH_PAGE + "?view=story&id=" + encodeURIComponent(entry.entry_id);
  }

  function assistantUrl(entry, tool) {
    return MONTH_PAGE + "?view=assistant&id=" + encodeURIComponent(entry.entry_id) + "&tool=" + encodeURIComponent(tool);
  }

  function workflowUrl(entry) {
    return MONTH_PAGE + "?view=workflow&id=" + encodeURIComponent(entry.entry_id);
  }

  function searchUrl(filters) {
    var params = new URLSearchParams();
    params.set("view", "search");
    Object.keys(filters || {}).forEach(function (key) {
      if (filters[key]) {
        params.set(key, filters[key]);
      }
    });
    return MONTH_PAGE + "?" + params.toString();
  }

  function entryCount(dateValue) {
    return grouped[dateValue] ? grouped[dateValue].length : 0;
  }

  function dayStatus(dateValue) {
    var count = entryCount(dateValue);
    var current = parseDate(dateValue);
    if (count > 0) return "covered";
    if (current <= CUTOFF) return "partial";
    return "future";
  }

  function fallbackBlock(label, className) {
    var parts = String(label || "GO").split(/\s+/).filter(Boolean).slice(0, 2);
    var abbr = parts.map(function (item) { return item.charAt(0).toUpperCase(); }).join("") || "GO";
    return "<div class='" + escapeHtml(className || "story-image") + " fallback'>" + escapeHtml(abbr) + "</div>";
  }

  function formatAccessDate(value) {
    if (!value) return "";
    var parts = String(value).split("-");
    if (parts.length === 3) {
      return parts[2] + "/" + parts[1] + "/" + parts[0];
    }
    return value;
  }

  function getDocumentUrl(entry) {
    return entry.document_url || entry.source_url || "";
  }

  function entryYear(entry) {
    var value = String((entry && entry.date) || "");
    return /^\d{4}/.test(value) ? value.slice(0, 4) : String(DATA.year || "");
  }

  function sourceFamily(entry) {
    var label = normalizeSearchText(entry.source_label || "");
    var city = normalizeSearchText(entry.city || "");
    var scope = normalizeSearchText(entry.scope || "");
    var note = normalizeSearchText(entry.source_note || "");

    if (label.indexOf("mpgo") >= 0 || label.indexOf("ministerio publico") >= 0 || label.indexOf("domp") >= 0 || note.indexOf("mpgo") >= 0) {
      return "MPGO";
    }

    if (
      label.indexOf("tjgo") >= 0 ||
      label.indexOf("tribunal de justica") >= 0 ||
      label.indexOf("diario da justica") >= 0 ||
      scope.indexOf("justica") >= 0
    ) {
      return "TJGO";
    }

    if (label.indexOf("diario municipal de goias") >= 0 || label.indexOf("agm") >= 0) {
      return "AGM / Municipios";
    }

    if (label.indexOf("aparecida de goiania") >= 0 || city === "aparecida de goiania") {
      return "Aparecida de Goiania";
    }

    if (label.indexOf("goiania") >= 0 || city === "goiania") {
      return "Goiania";
    }

    if (city === "estado de goias" || scope.indexOf("estadual") >= 0) {
      return "Estado de Goias";
    }

    if (scope.indexOf("municipal") >= 0) {
      return "Municipios";
    }

    return entry.scope || "Outras fontes";
  }

  function getDocumentLinkLabel(entry) {
    return entry.document_url ? "Abrir documento original" : "Abrir fonte original";
  }

  function getDocumentMarker(entry) {
    return entry.page_marker || entry.source_note || "Marcador a confirmar no documento original";
  }

  function getAccessedAt(entry) {
    return entry.accessed_at || DATA.accessed_at || DATA.updated_at || "";
  }

  function getPageImageUrl(entry) {
    return entry.page_image_url || entry.page_snapshot_url || entry.document_image_url || "";
  }

  function getPageText(entry) {
    return entry.page_text || entry.full_text || entry.document_text || entry.raw_text || entry.ocr_text || entry.page_excerpt || "";
  }

  function documentContextLabel(entry) {
    var hasText = !!getPageText(entry);
    var hasImage = !!getPageImageUrl(entry);

    if (hasText && hasImage) return "texto integral + imagem da pagina";
    if (hasText) return "texto integral";
    if (hasImage) return "imagem da pagina";
    return "metadados e resumo";
  }

  function documentCorpus(entry) {
    return normalizeSearchText([
      entry.title,
      getSublead(entry),
      getLead(entry),
      entry.summary,
      entry.source_note,
      entry.tag,
      entry.editoria,
      getPageText(entry)
    ].join(" "));
  }

  function evaluateDocumentCompleteness(entry) {
    var text = documentCorpus(entry);
    var hasPageText = !!getPageText(entry);
    var procurement = /(pregao|concorrencia|dispensa|inexigibilidade|licit|edital|ata de precos|registro de precos|contrat)/.test(text);
    var mentionsAnnex = /(anexo|termo de referencia|planilha|lista|relacao|itens|lotes|memorial|projeto basico|apenso|edital)/.test(text);
    var healthSupply = /(medic|insulina|farmac|remedio|insumo|saude)/.test(text);
    var hasItemLevelDetail = /(item \d+|lote \d+|comprimido|capsula|ampola|frasco|seringa|caixa|kit|unidades|quantitativo|especificac|dosagem|mg |ml )/.test(text);
    var missing = [];
    var clues = [];

    if (procurement) {
      clues.push("ato de compras ou contratacao");
    }
    if (mentionsAnnex) {
      clues.push("referencia a edital, lista ou anexo");
    }
    if (healthSupply) {
      clues.push("objeto ligado a medicamentos ou insumos");
    }

    if (procurement && !hasPageText) {
      missing.push("texto integral do ato");
    }
    if (mentionsAnnex && !hasPageText) {
      missing.push("anexo ou corpo completo da publicacao");
    }
    if (healthSupply && procurement && !hasItemLevelDetail) {
      missing.push("lista de itens ou medicamentos");
    }

    var level = "alto";
    var label = "Leitura suficiente para primeira triagem";
    var summary = "O item parece ter contexto minimo para seguir com linha fina preliminar.";

    if (missing.length >= 2) {
      level = "baixo";
      label = "Documento incompleto para fechamento";
      summary = "A pauta depende de corpo integral, anexo ou lista de itens antes de ganhar fechamento mais seguro.";
    } else if (missing.length === 1) {
      level = "medio";
      label = "Publicacao pede segunda busca";
      summary = "Ha um ponto documental pendente que pode mudar o peso noticioso da pauta.";
    }

    return {
      level: level,
      label: label,
      summary: summary,
      missing: uniqueList(missing),
      clues: uniqueList(clues),
      nextSteps: [
        "Procurar numero do processo, edital, ata ou contrato em edicoes anteriores e posteriores.",
        "Verificar se a lista de itens saiu em anexo, termo de referencia ou portal de compras.",
        "Checar se o diario remete a outro orgao, secretaria ou site para o documento completo."
      ]
    };
  }

  function renderCompletenessPanel(entry) {
    var evaluation = evaluateDocumentCompleteness(entry);
    return [
      "<div class='completeness-card is-" + escapeHtml(evaluation.level) + "'>",
      "<p class='section-kicker'>Leitura documental</p>",
      "<h3>" + escapeHtml(evaluation.label) + "</h3>",
      "<p class='muted'>" + escapeHtml(evaluation.summary) + "</p>",
      (evaluation.clues.length ? "<p class='panel-note'><strong>Sinais:</strong> " + escapeHtml(evaluation.clues.join(" | ")) + "</p>" : ""),
      (evaluation.missing.length ? "<ul class='warning-list'>" + evaluation.missing.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join("") + "</ul>" : "<p class='panel-note'>Nenhuma lacuna critica detectada na triagem automatica.</p>"),
      "<p class='panel-note'><strong>Busca seguinte:</strong> " + escapeHtml(evaluation.nextSteps[0]) + "</p>",
      "</div>"
    ].join("");
  }

  function renderDocumentTools(entry) {
    var documentUrl = getDocumentUrl(entry);
    var marker = getDocumentMarker(entry);
    var accessedAt = getAccessedAt(entry);
    var blocks = [
      "<div class='doc-strip'>",
      "<div class='doc-meta'>",
      "<span><strong>Pagina / marcador</strong>" + escapeHtml(marker) + "</span>",
      "<span><strong>Data de acesso</strong>" + escapeHtml(formatAccessDate(accessedAt)) + "</span>",
      "</div>"
    ];

    if (documentUrl) {
      blocks.push(
        "<a class='doc-link' href='" +
          escapeHtml(documentUrl) +
          "' target='_blank' rel='noopener noreferrer'>" +
          escapeHtml(getDocumentLinkLabel(entry)) +
        "</a>"
      );
    }

    blocks.push("</div>");
    return blocks.join("");
  }

  function renderAssistantLinks(entry) {
    return [
      "<div class='assistant-strip'>",
      "<a class='assistant-link' href='" + assistantUrl(entry, "gpt") + "'>Texto GPT</a>",
      "<a class='assistant-link' href='" + assistantUrl(entry, "notebook") + "'>Texto NotebookLM</a>",
      "<a class='assistant-link' href='" + workflowUrl(entry) + "'>Mesa hibrida</a>",
      "</div>"
    ].join("");
  }

  function getLead(entry) {
    return entry.lead || entry.summary || "";
  }

  function getSublead(entry) {
    return entry.sublead || entry.line || "";
  }

  function lowerFirst(value) {
    if (!value) return "";
    return value.charAt(0).toLowerCase() + value.slice(1);
  }

  function gptDraft(entry) {
    return [
      "Lead:",
      getLead(entry),
      "",
      "Sublead:",
      getSublead(entry),
      "",
      "Enquadramento sugerido:",
      "Em " + formatAccessDate(entry.date) + ", " + entry.city + " entrou no radar com uma publicacao de " + lowerFirst(entry.tag) + " na editoria de " + lowerFirst(entry.editoria) + ". O dado central da pauta e que " + lowerFirst(getSublead(entry)),
      "",
      "Caminho de apuracao:",
      "Vale ouvir a fonte oficial, checar impacto pratico, puxar historico do tema no municipio e medir o efeito administrativo, orcamentario ou politico da publicacao.",
      "",
      "Titulo de partida:",
      entry.title
    ].join("\n");
  }

  function notebookDraft(entry) {
    return [
      "Resumo documental para NotebookLM:",
      getLead(entry),
      "",
      "Sublead de apoio:",
      getSublead(entry),
      "",
      "Metadados da pauta:",
      "- Cidade: " + entry.city,
      "- Editoria: " + entry.editoria,
      "- Tipo de ato: " + entry.tag,
      "- Fonte: " + entry.source_label,
      "- Marcador: " + getDocumentMarker(entry),
      "- Data do documento: " + formatAccessDate(entry.date),
      "- Data de acesso: " + formatAccessDate(getAccessedAt(entry)),
      "",
      "Perguntas para a leitura assistida:",
      "- Qual e o efeito pratico imediato desse ato?",
      "- Existe valor, prazo, cronograma ou entrega futura que deva entrar no calendario?",
      "- Ha historico recente do mesmo tema, orgao ou fornecedor?",
      "- Quais pontos pedem checagem jornalistica adicional antes de publicar?"
    ].join("\n");
  }

  function assistantDraft(entry, tool) {
    return tool === "notebook" ? notebookDraft(entry) : gptDraft(entry);
  }

  var KEYWORD_STOPWORDS = {
    a: true, o: true, os: true, as: true, ao: true, aos: true, da: true, das: true, de: true, do: true, dos: true,
    e: true, em: true, na: true, nas: true, no: true, nos: true, para: true, por: true, com: true, sem: true,
    uma: true, um: true, umas: true, uns: true, que: true, seu: true, sua: true, seus: true, suas: true,
    sobre: true, entre: true, sob: true, mais: true, menos: true, muito: true, muita: true, muitas: true,
    muito: true, esse: true, essa: true, esses: true, essas: true, este: true, esta: true, estes: true,
    estas: true, isso: true, isto: true, sao: true, sera: true, serao: true, foi: true, ficam: true, fica: true,
    entra: true, saiu: true, pela: true, pelas: true, pelo: true, pelos: true, como: true, onde: true,
    quando: true, qual: true, quais: true, numa: true, num: true, nessa: true, nesse: true, nessa: true,
    desde: true, ate: true, apos: true, contra: true, toda: true, todo: true, todos: true, todas: true,
    parte: true, agora: true, ainda: true, depois: true, antes: true
  };

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function keywordList(value) {
    var unique = {};
    normalizeSearchText(value).split(/\s+/).forEach(function (token) {
      if (token.length >= 4 && !KEYWORD_STOPWORDS[token]) {
        unique[token] = true;
      }
    });
    return Object.keys(unique);
  }

  function keywordOverlap(entry, notebookNotes) {
    var base = keywordList(entry.title + " " + getSublead(entry) + " " + getLead(entry));
    var notebookMap = keywordList(notebookNotes).reduce(function (acc, token) {
      acc[token] = true;
      return acc;
    }, {});
    var shared = base.filter(function (token) {
      return notebookMap[token];
    });
    var ratio = base.length ? (shared.length / base.length) : 0;
    var level = "pendente";

    if (notebookNotes.trim()) {
      if (shared.length >= 4 || ratio >= 0.45) {
        level = "alto";
      } else if (shared.length >= 2 || ratio >= 0.2) {
        level = "medio";
      } else {
        level = "baixo";
      }
    }

    return {
      shared: shared,
      base: base,
      ratio: ratio,
      level: level
    };
  }

  function wordCount(value) {
    var text = String(value || "").trim();
    return text ? text.split(/\s+/).length : 0;
  }

  function lineCount(value) {
    var text = String(value || "").trim();
    return text ? text.split(/\r?\n/).filter(Boolean).length : 0;
  }

  function uniqueList(values) {
    var seen = {};
    return values.filter(function (item) {
      var key = item.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function extractDateMentions(value) {
    var text = String(value || "");
    var matches = [];
    var patterns = [
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{1,2} de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi
    ];

    patterns.forEach(function (pattern) {
      var result = text.match(pattern);
      if (result) {
        matches = matches.concat(result);
      }
    });

    return uniqueList(matches);
  }

  function firstUsefulLine(value) {
    var lines = String(value || "").split(/\r?\n/);
    var match = lines.find(function (line) {
      var trimmed = line.trim();
      return trimmed.length >= 24 && !/^[-*#]/.test(trimmed);
    });
    return match ? match.trim() : "";
  }

  function workflowStorageKey(entry) {
    return "pauteiro:notebook:" + entry.entry_id;
  }

  function storageAvailable() {
    try {
      return !!window.localStorage;
    } catch (error) {
      return false;
    }
  }

  function readNotebookNotes(entry) {
    if (!storageAvailable()) return "";
    return window.localStorage.getItem(workflowStorageKey(entry)) || "";
  }

  function saveNotebookNotes(entry, value) {
    if (!storageAvailable()) return false;
    window.localStorage.setItem(workflowStorageKey(entry), value || "");
    return true;
  }

  function clearNotebookNotes(entry) {
    if (!storageAvailable()) return false;
    window.localStorage.removeItem(workflowStorageKey(entry));
    return true;
  }

  function notebookPackage(entry) {
    var pageText = getPageText(entry);
    var pageImageUrl = getPageImageUrl(entry);
    return [
      "PAUTEIRO! | Pacote para NotebookLM",
      "Pauta: " + entry.title,
      "",
      "Base documental",
      "- Cidade: " + entry.city,
      "- Editoria: " + entry.editoria,
      "- Escopo: " + entry.scope,
      "- Tipo de ato: " + entry.tag,
      "- Fonte: " + entry.source_label,
      "- Marcador: " + getDocumentMarker(entry),
      "- Documento original: " + (getDocumentUrl(entry) || entry.source_url || "sem link cadastrado"),
      "- Data do ato: " + formatAccessDate(entry.date),
      "- Data de acesso: " + formatAccessDate(getAccessedAt(entry)),
      "",
      "Linha fina preliminar",
      entry.line,
      "",
      "Sublead preliminar",
      getSublead(entry),
      "",
      "Lead preliminar",
      getLead(entry),
      "",
      "Resumo de apoio",
      entry.summary,
      "",
      "Contexto bruto para leitura do todo",
      "- Cobertura documental enviada: " + documentContextLabel(entry),
      "- Link do documento original: " + (getDocumentUrl(entry) || entry.source_url || "sem link cadastrado"),
      "- Imagem editorial de apoio: " + (entry.image_url || "sem imagem cadastrada"),
      (entry.image_credit ? "- Credito da imagem editorial: " + entry.image_credit : ""),
      "- Captura / imagem da pagina: " + (pageImageUrl || "nao cadastrada nesta base; ideal anexar print ou PDF da pagina"),
      "- Texto integral da pagina: " + (pageText ? "incluido abaixo" : "nao cadastrado nesta base; ideal anexar OCR ou colar o texto bruto do ato"),
      "",
      "Texto integral / OCR da pagina",
      pageText || "[Sem texto integral salvo neste item. Para a leitura mais forte do NotebookLM, anexe a pagina do diario em PDF, imagem ou texto OCRizado.]",
      "",
      "Perguntas para a leitura manual",
      "1. Qual e o ponto mais forte de noticia neste documento?",
      "2. Ha nomes, valores, empresas, prazos ou datas futuras que merecem destaque?",
      "3. O ato sugere desdobramento politico, administrativo, juridico ou orcamentario?",
      "4. O que precisa de segunda checagem antes de virar materia?",
      "5. Que orientacao deve ser passada ao chat para redigir o texto final?",
      "",
      "Retorno esperado no PAUTEIRO",
      "- achado principal",
      "- linha fina revisada",
      "- agenda futura",
      "- observacoes de contexto",
      "- pontos de apuracao"
    ].join("\n");
  }

  function buildFinalBrief(entry, notebookNotes) {
    var notebookLine = firstUsefulLine(notebookNotes);
    var mergedLine = notebookLine || entry.line;
    var overlap = keywordOverlap(entry, notebookNotes);
    var completeness = evaluateDocumentCompleteness(entry);
    var dateMentions = extractDateMentions((notebookNotes || "") + "\n" + getLead(entry) + "\n" + getSublead(entry));
    var consensusText = overlap.level === "pendente"
      ? "Leitura manual ainda nao colada no PAUTEIRO."
      : ("Consenso " + overlap.level + " entre leitura automatica e leitura manual, com " + overlap.shared.length + " termo(s) em comum.");

    return [
      "Linha fina:",
      mergedLine,
      "",
      "Sublead:",
      getSublead(entry),
      "",
      "Lead:",
      getLead(entry),
      "",
      "Cruze a apuracao assim:",
      consensusText,
      notebookLine ? ("A leitura manual reforca o angulo: " + notebookLine) : "A leitura manual ainda nao trouxe angulo adicional para revisar o texto final.",
      "",
      "Alerta documental:",
      completeness.label + ". " + completeness.summary,
      completeness.missing.length ? ("Pendencias: " + completeness.missing.join(" | ")) : "Sem pendencia documental critica detectada nesta passada.",
      "",
      "Agenda / datas para seguir:",
      dateMentions.length ? dateMentions.join(" | ") : "Sem nova data detectada na leitura cruzada.",
      "",
      "Fonte oficial:",
      entry.source_label + " | " + getDocumentMarker(entry),
      getDocumentUrl(entry) || entry.source_url || "",
      "",
      "Instrucao para o chat final:",
      "Redigir texto jornalistico objetivo com base no ato oficial, citar a fonte, manter o marcador do documento e usar enfoque de " + lowerFirst(entry.editoria) + "."
    ].join("\n");
  }

  function metricCard(label, value, tone) {
    return [
      "<div class='metric-card" + (tone ? " is-" + tone : "") + "'>",
      "<span>" + escapeHtml(label) + "</span>",
      "<strong>" + escapeHtml(String(value)) + "</strong>",
      "</div>"
    ].join("");
  }

  function renderWorkflowMetrics(entry, notebookNotes) {
    var autoDraft = assistantDraft(entry, "gpt");
    var packageText = notebookPackage(entry);
    var finalBrief = buildFinalBrief(entry, notebookNotes);
    var overlap = keywordOverlap(entry, notebookNotes);
    var completeness = evaluateDocumentCompleteness(entry);
    var dateMentions = extractDateMentions(notebookNotes);
    var levelLabel = overlap.level === "pendente" ? "Aguardando" : capitalize(overlap.level);
    var sharedTerms = overlap.shared.length ? overlap.shared.slice(0, 8).join(", ") : "A leitura manual ainda nao trouxe termos em comum suficientes para comparar.";

    return [
      "<div class='metrics-grid'>",
      metricCard("Consenso", levelLabel, overlap.level),
      metricCard("Documento", capitalize(completeness.level), completeness.level),
      metricCard("Palavras IA", wordCount(autoDraft)),
      metricCard("Palavras Notebook", wordCount(notebookNotes)),
      metricCard("Linhas Notebook", lineCount(notebookNotes)),
      metricCard("Datas citadas", dateMentions.length),
      metricCard("Pacote bruto", wordCount(packageText)),
      metricCard("Fechamento", wordCount(finalBrief)),
      metricCard("Termos em comum", overlap.shared.length),
      "</div>",
      "<p class='panel-note'>" + escapeHtml(sharedTerms) + "</p>"
    ].join("");
  }

  function downloadTextFile(filename, contents) {
    if (!window.URL || !window.URL.createObjectURL) {
      return;
    }

    var blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    var blobUrl = window.URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
      window.URL.revokeObjectURL(blobUrl);
    }, 0);
  }

  function rankedEntries() {
    return entries
      .slice()
      .sort(function (a, b) {
        if ((b.highlight_score || 0) !== (a.highlight_score || 0)) return (b.highlight_score || 0) - (a.highlight_score || 0);
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return a.title.localeCompare(b.title);
      });
  }

  function uniqueFieldValues(field) {
    var seen = {};
    return entries
      .map(function (entry) { return entry[field]; })
      .filter(function (value) {
        if (!value) return false;
        var key = String(value).toLowerCase();
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .sort(function (a, b) { return a.localeCompare(b); });
  }

  function archiveYearOptions() {
    var seen = {};
    return ((DATA.archive_years || []).map(function (item) {
      return String(item.year);
    }).concat(entries.map(entryYear)))
      .filter(function (value) {
        if (!value) return false;
        if (seen[value]) return false;
        seen[value] = true;
        return true;
      })
      .sort(function (a, b) { return b.localeCompare(a); });
  }

  function sourceFamilyOptions() {
    var seen = {};
    var seed = [
      "MPGO",
      "TJGO",
      "Estado de Goias",
      "AGM / Municipios",
      "Municipios",
      "Goiania",
      "Aparecida de Goiania"
    ];

    return seed.concat(entries.map(sourceFamily))
      .filter(function (value) {
        if (!value) return false;
        if (seen[value]) return false;
        seen[value] = true;
        return true;
      })
      .sort(function (a, b) { return a.localeCompare(b); });
  }

  function searchableEntryText(entry) {
    return normalizeSearchText([
      entry.title,
      entry.line,
      entry.summary,
      entry.city,
      entry.editoria,
      entry.tag,
      entry.scope,
      sourceFamily(entry),
      entryYear(entry),
      entry.source_label,
      entry.source_note,
      getDocumentMarker(entry),
      getPageText(entry)
    ].join(" "));
  }

  function normalizeFilterDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? value : "";
  }

  function currentSearchFilters() {
    var params = new URLSearchParams(window.location.search);
    return {
      q: (params.get("q") || "").trim(),
      year: (params.get("year") || "").trim(),
      family: (params.get("family") || "").trim(),
      city: (params.get("city") || "").trim(),
      editoria: (params.get("editoria") || "").trim(),
      scope: (params.get("scope") || "").trim(),
      from: normalizeFilterDate(params.get("from") || ""),
      to: normalizeFilterDate(params.get("to") || "")
    };
  }

  function searchEntries(filters) {
    var rawQuery = normalizeSearchText(filters.q || "");
    var queryTokens = keywordList(filters.q || "");

    if (!queryTokens.length && rawQuery) {
      queryTokens = rawQuery.split(/\s+/).filter(Boolean);
    }

    return entries
      .map(function (entry) {
        if (filters.year && entryYear(entry) !== filters.year) return null;
        if (filters.family && sourceFamily(entry) !== filters.family) return null;
        if (filters.city && entry.city !== filters.city) return null;
        if (filters.editoria && entry.editoria !== filters.editoria) return null;
        if (filters.scope && entry.scope !== filters.scope) return null;
        if (filters.from && entry.date < filters.from) return null;
        if (filters.to && entry.date > filters.to) return null;

        var haystack = searchableEntryText(entry);
        var matchedTokens = [];
        var score = (entry.highlight_score || 0);

        if (rawQuery) {
          matchedTokens = queryTokens.filter(function (token) {
            return haystack.indexOf(token) >= 0;
          });

          var exactQueryMatch = haystack.indexOf(rawQuery) >= 0;
          if (!matchedTokens.length && !exactQueryMatch) {
            return null;
          }

          score += matchedTokens.length * 8;
          if (exactQueryMatch) score += 24;
          if (normalizeSearchText(entry.city).indexOf(rawQuery) >= 0) score += 10;
          if (normalizeSearchText(entry.editoria).indexOf(rawQuery) >= 0) score += 8;
          if (normalizeSearchText(entry.tag).indexOf(rawQuery) >= 0) score += 6;
          if (normalizeSearchText(sourceFamily(entry)).indexOf(rawQuery) >= 0) score += 7;
          if (entryYear(entry).indexOf(rawQuery) >= 0) score += 5;
        }

        if (filters.year) score += 4;
        if (filters.family) score += 4;
        if (filters.city) score += 4;
        if (filters.editoria) score += 3;
        if (filters.scope) score += 2;

        return {
          entry: entry,
          score: score,
          matchedTokens: matchedTokens
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        if (b.entry.date !== a.entry.date) return b.entry.date.localeCompare(a.entry.date);
        return a.entry.title.localeCompare(b.entry.title);
      });
  }

  function optionList(values, current, emptyLabel) {
    return [
      "<option value=''>" + escapeHtml(emptyLabel) + "</option>"
    ].concat(values.map(function (value) {
      return "<option value='" + escapeHtml(value) + "'" + (value === current ? " selected" : "") + ">" + escapeHtml(value) + "</option>";
    })).join("");
  }

  function renderCoverageBoard() {
    return [
      "<div class='coverage-grid'>",
      DATA.year_months.map(function (item) {
        return [
          "<div class='coverage-chip is-" + escapeHtml(item.status) + "'>",
          "<strong>" + escapeHtml(item.label) + "</strong>",
          "<span>" + escapeHtml(item.note) + "</span>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function renderArchiveYearBoard() {
    var years = DATA.archive_years || [];
    if (!years.length) return "";

    return [
      "<div class='coverage-grid'>",
      years.map(function (item) {
        return [
          "<div class='coverage-chip is-" + escapeHtml(item.status || "open") + "'>",
          "<strong>" + escapeHtml(String(item.year)) + "</strong>",
          "<span>" + escapeHtml(item.note || "arquivo em preparacao") + "</span>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function groupCount(field) {
    return entries.reduce(function (acc, entry) {
      acc[entry[field]] = (acc[entry[field]] || 0) + 1;
      return acc;
    }, {});
  }

  function topGroupLabel(field) {
    var counts = groupCount(field);
    var topKey = "";
    var topValue = 0;

    Object.keys(counts).forEach(function (key) {
      if (counts[key] > topValue) {
        topKey = key;
        topValue = counts[key];
      }
    });

    return topKey ? (topKey + " (" + topValue + ")") : "Sem dado";
  }

  function monthCoverageSummary() {
    var counts = {};
    entries.forEach(function (entry) {
      var monthKey = entry.date.slice(0, 7);
      counts[monthKey] = (counts[monthKey] || 0) + 1;
    });
    return counts;
  }

  function renderAnnualAnalysisSection() {
    var monthCounts = monthCoverageSummary();
    var activeMonths = Object.keys(monthCounts).length;
    var latestEntry = rankedEntries()[0];
    var earliestEntry = entries
      .slice()
      .sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
    var archiveYears = DATA.archive_years || [];
    var coverageGoal = DATA.coverage_goal || {};
    var priorityFronts = (coverageGoal.priority_fronts || []).slice(0, 3).join(" | ");

    return [
      "<section class='news-section' id='analise-2026'>",
      "<div class='section-head'><div><p class='section-kicker'>Arquivo editorial</p><h2>Da rodada diaria ao acervo 2024-2026</h2></div><p class='section-intro'>A home deixa de olhar so para abril e passa a assumir a expansao historica. Hoje, a carga publica segue preenchida ate " + escapeHtml(formatAccessDate(DATA.cutoff_date)) + ", mas a estrutura ja foi aberta para 2024, 2025 e 2026 inteiro, com prioridade alta para TJGO, MPGO e municipios.</p></div>",
      "<div class='year-analysis-grid'>",
      "<div class='sidebar-card'><h3>Leitura do ano</h3><div class='metrics-grid'>" +
        metricCard("Ano", DATA.year) +
        metricCard("Pautas", entries.length) +
        metricCard("Arquivos abertos", archiveYears.length) +
        metricCard("Meses com dados", activeMonths) +
        metricCard("Fontes mapeadas", DATA.sources.length) +
        metricCard("Municipio lider", topGroupLabel("city")) +
        metricCard("Editoria lider", topGroupLabel("editoria")) +
      "</div></div>",
      "<div class='sidebar-card'><h3>Cobertura mes a mes</h3><p class='panel-note'>Os meses abertos ja aparecem no radar para receber ingestao assim que entrarem no fluxo. Abril segue como base publica preenchida nesta versao.</p>" + renderCoverageBoard() + "</div>",
      "<div class='sidebar-card'><h3>Cobertura alvo</h3><div class='panel-item'><span>Primeira pauta</span><strong>" + escapeHtml(earliestEntry ? formatAccessDate(earliestEntry.date) : "n/a") + "</strong></div><div class='panel-item'><span>Ultima pauta</span><strong>" + escapeHtml(latestEntry ? formatAccessDate(latestEntry.date) : "n/a") + "</strong></div><div class='panel-item'><span>Meta territorial</span><strong>" + escapeHtml(String(coverageGoal.municipalities_total || 0)) + " municipios</strong></div><p class='panel-note'>Prioridades imediatas: " + escapeHtml(priorityFronts || "TJGO, MPGO e municipios") + ".</p>" + renderArchiveYearBoard() + "</div>",
      "</div>",
      "</section>"
    ].join("");
  }

  function sourceCadenceRows() {
    return [
      {
        source: "Goiânia",
        type: "Diário Oficial do Município",
        window: "Disponibilizacao online imediata; fechamento de materias ate 18h do dia anterior.",
        check: "Sugestao do PAUTEIRO: 08h10, 12h30 e 18h10 em dias uteis.",
        basis: "Oficial para consulta imediata e corte das 18h; janelas de checagem sao inferencia editorial."
      },
      {
        source: "Aparecida de Goiânia",
        type: "Diário Oficial Eletrônico",
        window: "Cronograma oficial: materias recebidas ate 13h e publicacao no proximo dia util ate 00h.",
        check: "Sugestao do PAUTEIRO: 00h15, 07h30 e 10h.",
        basis: "Base oficial no Decreto publicado na edicao 13 do DOE municipal."
      },
      {
        source: "AGM / Municipios sem diário proprio",
        type: "Diário Municipal de Goiás",
        window: "Publicacao diaria no site da AGM; o portal menciona tambem edicoes extraordinarias, sem hora publica indexada.",
        check: "Sugestao do PAUTEIRO: 06h30, 09h30, 13h30 e 18h30.",
        basis: "Periodicidade oficial confirmada; horario exato nao encontrado nas paginas publicas indexadas."
      },
      {
        source: "Estado de Goiás",
        type: "Diário Oficial do Estado",
        window: "Publicacao principal a partir das 08h; prazo de envio segue ate 17h dos dias uteis.",
        check: "Sugestao do PAUTEIRO: 08h05, 10h e 17h10.",
        basis: "Horario oficial informado pelo Portal Goiás em 26 de fevereiro de 2020."
      },
      {
        source: "TJGO",
        type: "Diário da Justiça Eletrônico",
        window: "A pagina indica 'Publicacao de Hoje' e diz que a data da publicacao e o primeiro dia util seguinte a disponibilizacao; horario da disponibilizacao nao aparece com clareza na pagina consultada.",
        check: "Sugestao do PAUTEIRO: 07h, 12h30 e 17h30, com olho em suplementos.",
        basis: "Regra oficial de disponibilizacao/publicacao confirmada; janelas de captura sao inferencia."
      },
      {
        source: "MPGO",
        type: "DOMP",
        window: "Edicoes aparecem por data no portal e ha possibilidade de suplementar; horario exato nao apareceu na pagina publica consultada.",
        check: "Sugestao do PAUTEIRO: 08h, 13h e 18h.",
        basis: "Frequencia diaria observavel no portal; horario exato nao confirmado na pagina aberta."
      }
    ];
  }

  function renderCadenceCard(item) {
    return [
      "<article class='cadence-card'>",
      "<p class='section-kicker'>" + escapeHtml(item.source) + "</p>",
      "<h3>" + escapeHtml(item.type) + "</h3>",
      "<p>" + escapeHtml(item.window) + "</p>",
      "<p class='cadence-check'><strong>Janela de captura:</strong> " + escapeHtml(item.check) + "</p>",
      "<p class='panel-note'>" + escapeHtml(item.basis) + "</p>",
      "</article>"
    ].join("");
  }

  function renderUpdateCadenceSection() {
    var rows = sourceCadenceRows();
    return [
      "<section class='news-section' id='atualizacao'>",
      "<div class='section-head'><div><p class='section-kicker'>Atualizacao continua</p><h2>O relogio das fontes</h2></div><p class='section-intro'>Como cada diario fecha e sobe em horarios diferentes, o PAUTEIRO precisa trabalhar por janela de captura e nao por uma raspagem unica no fim do dia.</p></div>",
      "<div class='cadence-grid'>" + rows.map(renderCadenceCard).join("") + "</div>",
      "</section>"
    ].join("");
  }

  function renderSearchResultCard(result) {
    var entry = result.entry;
    var matches = result.matchedTokens.length
      ? "<p class='search-match-copy'>Bate com: " + escapeHtml(result.matchedTokens.slice(0, 8).join(", ")) + "</p>"
      : "";

    return [
      "<article class='search-result-card'>",
      "<a class='search-result-media' href='" + storyUrl(entry) + "'>" + renderImage(entry, "search-result-image") + "</a>",
      "<div class='search-result-body'>",
      "<div class='meta-row'><span class='tag'>" + escapeHtml(entry.tag) + "</span><span>" + escapeHtml(entry.city) + "</span><span>" + escapeHtml(sourceFamily(entry)) + "</span><span>" + escapeHtml(formatAccessDate(entry.date)) + "</span></div>",
      "<h2><a href='" + storyUrl(entry) + "'>" + escapeHtml(entry.title) + "</a></h2>",
      "<p class='story-sublead'>" + escapeHtml(getSublead(entry)) + "</p>",
      "<p class='story-lead'>" + escapeHtml(getLead(entry)) + "</p>",
      matches,
      "<p class='story-source'>Fonte: <a href='" + escapeHtml(entry.source_url) + "' target='_blank' rel='noopener noreferrer'>" + escapeHtml(entry.source_label) + "</a></p>",
      "<div class='assistant-strip'>",
      "<a class='assistant-link' href='" + storyUrl(entry) + "'>Abrir pauta</a>",
      "<a class='assistant-link' href='" + workflowUrl(entry) + "'>Mesa hibrida</a>",
      "<a class='assistant-link' href='" + dayUrl(entry.date) + "'>Abrir dia</a>",
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }

  function renderSearchView() {
    var filters = currentSearchFilters();
    var results = searchEntries(filters);
    var years = archiveYearOptions();
    var families = sourceFamilyOptions();
    var cities = uniqueFieldValues("city");
    var editorias = uniqueFieldValues("editoria");
    var scopes = uniqueFieldValues("scope");
    var activeFilterCount = [filters.q, filters.year, filters.family, filters.city, filters.editoria, filters.scope, filters.from, filters.to].filter(Boolean).length;
    var cityCount = {};
    var editoriaCount = {};
    var familyCount = {};
    results.forEach(function (result) {
      cityCount[result.entry.city] = true;
      editoriaCount[result.entry.editoria] = true;
      familyCount[sourceFamily(result.entry)] = true;
    });
    var firstDate = results.length ? results[results.length - 1].entry.date : "";
    var lastDate = results.length ? results[0].entry.date : "";
    var queryIntro = activeFilterCount
      ? "A busca cruza municipio, ano, familia de fonte, periodo e assunto sobre o arquivo do PAUTEIRO!. Hoje, o preenchimento factual publico vai ate " + formatAccessDate(DATA.cutoff_date) + "."
      : "Abra uma busca geral por municipio, ano, tipo de diario, editoria ou assunto. A estrutura ja esta pronta para 2024, 2025 e 2026; a base publica atual cobre ate " + formatAccessDate(DATA.cutoff_date) + ".";

    document.title = DATA.site_title + " | Busca";
    root.className = "wrap page-shell";
    root.innerHTML = [
      "<header class='page-header'>",
      "<div>",
      "<p class='eyebrow'>PAUTEIRO! | Busca na base</p>",
      "<h1 class='page-title'>Consulta por municipio, ano, tipo de diario e assunto</h1>",
      "<p class='intro'>" + escapeHtml(queryIntro) + "</p>",
      "<div class='nav-row'>",
      "<a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar a capa</a>",
      "<a class='nav-pill' href='" + chronologyUrl() + "'>Abrir cronologia</a>",
      "<a class='nav-pill' href='" + searchUrl({ year: "2026" }) + "'>Buscar 2026</a>",
      "<a class='nav-pill' href='" + searchUrl({ year: "2025" }) + "'>Abrir 2025</a>",
      "<a class='nav-pill' href='" + searchUrl({ family: "TJGO" }) + "'>Foco TJGO</a>",
      "</div>",
      "</div>",
      "<aside class='sidebar-card'>",
      "<h3>Arquivo ativo</h3>",
      "<div class='panel-item'><span>Ano corrente</span><strong>" + escapeHtml(String(DATA.year)) + "</strong></div>",
      "<div class='panel-item'><span>Anos abertos</span><strong>" + escapeHtml(String((DATA.archive_years || []).length)) + "</strong></div>",
      "<div class='panel-item'><span>Atualizado ate</span><strong>" + escapeHtml(formatAccessDate(DATA.cutoff_date)) + "</strong></div>",
      "<div class='panel-item'><span>Pautas disponiveis</span><strong>" + entries.length + "</strong></div>",
      "<p class='panel-note'>O desenho agora suporta arquivo historico, pesquisa sob demanda e aprofundamento por familia de fonte, sem trocar a interface.</p>",
      "</aside>",
      "</header>",
      "<section class='search-layout'>",
      "<div class='search-main'>",
      "<form class='search-form-card' method='get' action='" + MONTH_PAGE + "'>",
      "<input type='hidden' name='view' value='search'>",
      "<div class='search-form-grid'>",
      "<label class='filter-field filter-field-wide'><span>Assunto ou pergunta</span><input type='search' name='q' value='" + escapeHtml(filters.q) + "' placeholder='Ex.: MPGO inqueritos ambientais, TJGO custodia, Goiania nomeacoes'></label>",
      "<label class='filter-field'><span>Ano</span><select name='year'>" + optionList(years, filters.year, "Todos") + "</select></label>",
      "<label class='filter-field'><span>Tipo de diario</span><select name='family'>" + optionList(families, filters.family, "Todos") + "</select></label>",
      "<label class='filter-field'><span>Municipio ou orgao</span><select name='city'>" + optionList(cities, filters.city, "Todos") + "</select></label>",
      "<label class='filter-field'><span>Editoria</span><select name='editoria'>" + optionList(editorias, filters.editoria, "Todas") + "</select></label>",
      "<label class='filter-field'><span>Escopo</span><select name='scope'>" + optionList(scopes, filters.scope, "Todos") + "</select></label>",
      "<label class='filter-field'><span>De</span><input type='date' name='from' value='" + escapeHtml(filters.from) + "'></label>",
      "<label class='filter-field'><span>Ate</span><input type='date' name='to' value='" + escapeHtml(filters.to) + "'></label>",
      "</div>",
      "<div class='assistant-actions'>",
      "<button class='assistant-button' type='submit'>Buscar na base</button>",
      "<a class='assistant-button is-link' href='" + searchUrl({}) + "'>Limpar filtros</a>",
      "</div>",
      "</form>",
      "<section class='search-summary-card'>",
      "<div class='section-head'><div><p class='section-kicker'>Resultado</p><h2>Leitura geral do recorte</h2></div><p class='section-intro'>A busca trabalha com texto livre, ano, municipio, familia de fonte, editoria, escopo e intervalo de datas. O ranking mistura aderencia textual e peso noticioso.</p></div>",
      "<div class='metrics-grid'>",
      metricCard("Resultados", results.length),
      metricCard("Municipios", Object.keys(cityCount).length),
      metricCard("Familias", Object.keys(familyCount).length),
      metricCard("Editorias", Object.keys(editoriaCount).length),
      metricCard("Filtros ativos", activeFilterCount),
      metricCard("De", firstDate ? formatAccessDate(firstDate) : "n/a"),
      metricCard("Ate", lastDate ? formatAccessDate(lastDate) : "n/a"),
      "</div>",
      "</section>",
      "<section class='search-results-stack'>",
      (results.length
        ? results.map(renderSearchResultCard).join("")
        : "<div class='empty-state'><h3>Nenhuma pauta localizada</h3><p class='empty-copy'>Tente abrir mais o periodo, tirar um filtro ou trocar o assunto por termos como edital, contrato, nomeacao, saude ou justica.</p></div>"),
      "</section>",
      "</div>",
      "<aside class='note-stack'>",
      "<div class='sidebar-card'><h3>Arquivo historico</h3><p class='panel-note'>O PAUTEIRO! entra em modo de expansao para 2024, 2025 e 2026, com busca unica por toda a serie.</p>" + renderArchiveYearBoard() + "</div>",
      "<div class='sidebar-card'><h3>Meta de cobertura</h3><div class='panel-item'><span>Municipios alvo</span><strong>" + escapeHtml(String((DATA.coverage_goal && DATA.coverage_goal.municipalities_total) || 0)) + "</strong></div><div class='panel-item'><span>Prioridade</span><strong>TJGO + MPGO</strong></div><p class='panel-note'>" + escapeHtml(((DATA.coverage_goal && DATA.coverage_goal.target_scope) || "todos os municipios goianos").replace(/^./, function (letter) { return letter.toUpperCase(); })) + ".</p></div>",
      "<div class='note-card'><h3>Como perguntar</h3><ul><li>Use municipio + tema + ano: Rio Verde contratos saude 2025.</li><li>Use orgao + tipo de ato: MPGO recomendacao, TJGO edital, AGM licitacao.</li><li>Use recorte amplo para varrer o arquivo: medicacao, nomeacao, jeton, contrato, inquerito.</li></ul></div>",
      "<div class='note-card'><h3>Ponto editorial</h3><p class='muted'>Resultado de busca nao substitui leitura documental. Quando o ato vier sem lista, anexo ou corpo integral, a mesa hibrida sinaliza a segunda busca antes da manchete.</p></div>",
      "</aside>",
      "</section>"
    ].join("");
  }

  function hasAgendaSignal(entry) {
    var hay = (entry.title + " " + getSublead(entry) + " " + getLead(entry)).toLowerCase();
    return /(marcad|previst|periodo|convoc|sessao|edital|concorrencia|pregao|plantao|31 de maio|30 de abril|28 de abril|22 de abril|15 de abril)/.test(hay);
  }

  function renderHeroMain(entry) {
    if (!entry) return "";
    return [
      "<article class='hero-main-story'>",
      "<a class='hero-link' href='" + storyUrl(entry) + "'>",
      renderImage(entry, "hero-image"),
      "<div class='hero-copy'>",
      "<p class='hero-meta'><span class='tag'>" + escapeHtml(entry.tag) + "</span><span>" + escapeHtml(entry.city) + "</span><span>" + escapeHtml(formatAccessDate(entry.date)) + "</span></p>",
      "<h1 class='hero-title'>" + escapeHtml(entry.title) + "</h1>",
      "<p class='hero-sublead'>" + escapeHtml(getSublead(entry)) + "</p>",
      "<p class='hero-lead'>" + escapeHtml(getLead(entry)) + "</p>",
      "</div>",
      "</a>",
      "</article>"
    ].join("");
  }

  function renderHeroSecondary(entry) {
    return [
      "<article class='hero-secondary-story'>",
      "<a class='hero-link' href='" + storyUrl(entry) + "'>",
      renderImage(entry, "hero-secondary-image"),
      "<div class='hero-secondary-copy'>",
      "<p class='hero-secondary-meta'>" + escapeHtml(entry.city) + " | " + escapeHtml(entry.editoria) + "</p>",
      "<h2>" + escapeHtml(entry.title) + "</h2>",
      "<p>" + escapeHtml(getSublead(entry)) + "</p>",
      "</div>",
      "</a>",
      "</article>"
    ].join("");
  }

  function renderNowItem(entry) {
    return [
      "<li>",
      "<a href='" + storyUrl(entry) + "'>",
      "<strong>" + escapeHtml(entry.city) + "</strong>",
      "<span>" + escapeHtml(entry.title) + "</span>",
      "</a>",
      "</li>"
    ].join("");
  }

  function renderAgendaItem(entry) {
    return [
      "<li>",
      "<a href='" + storyUrl(entry) + "'>",
      "<strong>" + escapeHtml(entry.city) + "</strong>",
      "<span>" + escapeHtml(getSublead(entry)) + "</span>",
      "<small>" + escapeHtml(entry.tag) + " | " + escapeHtml(formatAccessDate(entry.date)) + "</small>",
      "</a>",
      "</li>"
    ].join("");
  }

  function renderEditoriaSection(label, items) {
    var lead = items[0];
    var rest = items.slice(1, 4);
    return [
      "<section class='editoria-block'>",
      "<div class='editoria-head'><p class='section-kicker'>" + escapeHtml(label) + "</p><a class='editoria-more' href='" + chronologyUrl() + "'>Ver tudo</a></div>",
      "<a class='editoria-lead' href='" + storyUrl(lead) + "'>",
      "<h3>" + escapeHtml(lead.title) + "</h3>",
      "<p class='editoria-sublead'>" + escapeHtml(getSublead(lead)) + "</p>",
      "</a>",
      "<ul class='editoria-list'>",
      rest.map(function (entry) {
        return "<li><a href='" + storyUrl(entry) + "'><strong>" + escapeHtml(entry.city) + "</strong><span>" + escapeHtml(entry.title) + "</span></a></li>";
      }).join(""),
      "</ul>",
      "</section>"
    ].join("");
  }

  function renderEditoriaDeck(ranked) {
    var groupedByEditoria = {};
    ranked.forEach(function (entry) {
      if (!groupedByEditoria[entry.editoria]) groupedByEditoria[entry.editoria] = [];
      groupedByEditoria[entry.editoria].push(entry);
    });

    return Object.keys(groupedByEditoria)
      .sort(function (a, b) {
        if (groupedByEditoria[b].length !== groupedByEditoria[a].length) return groupedByEditoria[b].length - groupedByEditoria[a].length;
        return a.localeCompare(b);
      })
      .slice(0, 4)
      .map(function (editoria) {
        return renderEditoriaSection(editoria, groupedByEditoria[editoria]);
      })
      .join("");
  }

  function renderMunicipalitySpotlight(ranked) {
    var cities = {};
    ranked.forEach(function (entry) {
      if (!cities[entry.city]) cities[entry.city] = [];
      cities[entry.city].push(entry);
    });

    return Object.keys(cities)
      .sort(function (a, b) {
        if (cities[b].length !== cities[a].length) return cities[b].length - cities[a].length;
        return a.localeCompare(b);
      })
      .slice(0, 6)
      .map(function (city) {
        var lead = cities[city][0];
        return [
          "<article class='city-spotlight'>",
          "<p class='section-kicker'>" + escapeHtml(city) + "</p>",
          "<a href='" + storyUrl(lead) + "'><h3>" + escapeHtml(lead.title) + "</h3></a>",
          "<p>" + escapeHtml(getSublead(lead)) + "</p>",
          "<span>" + cities[city].length + " pauta(s) nesta rodada</span>",
          "</article>"
        ].join("");
      })
      .join("");
  }

  function storyBody(entry) {
    return [
      getLead(entry),
      "A publicacao foi localizada pelo PAUTEIRO! em " + entry.source_label + ", com registro em " + getDocumentMarker(entry) + ".",
      "No recorte editorial desta pauta, o que chama atencao e que " + lowerFirst(getSublead(entry)) + "."
    ];
  }

  function renderRelatedStories(entry) {
    return rankedEntries()
      .filter(function (item) {
        return item.entry_id !== entry.entry_id && (item.city === entry.city || item.editoria === entry.editoria);
      })
      .slice(0, 4)
      .map(function (item) {
        return "<li><a href='" + storyUrl(item) + "'><strong>" + escapeHtml(item.city) + "</strong><span>" + escapeHtml(item.title) + "</span></a></li>";
      })
      .join("");
  }

  function renderImage(entry, className) {
    var finalClass = className || "story-image";
    if (entry.image_url) {
      return "<img class='" + escapeHtml(finalClass) + "' loading='lazy' src='" + escapeHtml(entry.image_url) + "' alt='" + escapeHtml("Imagem relacionada a " + entry.city) + "'>";
    }
    return fallbackBlock(entry.city, finalClass);
  }

  function storyCard(entry, large) {
    var tagName = large ? "h3" : "h4";
    var credit = entry.image_credit ? "<p class='story-credit'>Credito da imagem: " + escapeHtml(entry.image_credit) + "</p>" : "";
    var note = entry.source_note ? " <span>" + escapeHtml(entry.source_note) + "</span>" : "";
    return [
      "<article class='story-card'>",
      renderImage(entry),
      "<div class='story-body'>",
      credit,
      "<div class='meta-row'><span class='tag'>" + escapeHtml(entry.tag) + "</span><span>" + escapeHtml(entry.city) + "</span><span>" + escapeHtml(entry.date) + "</span></div>",
      "<" + tagName + ">" + escapeHtml(entry.title) + "</" + tagName + ">",
      "<p class='story-sublead'>" + escapeHtml(getSublead(entry)) + "</p>",
      "<p class='story-lead'>" + escapeHtml(getLead(entry)) + "</p>",
      "<p class='story-source'>Fonte: <a href='" + escapeHtml(entry.source_url) + "'>" + escapeHtml(entry.source_label) + "</a>" + note + "</p>",
      renderDocumentTools(entry),
      renderAssistantLinks(entry),
      "</div>",
      "</article>"
    ].join("");
  }

  function timelineCard(entry) {
    var note = entry.source_note ? " | " + escapeHtml(entry.source_note) : "";
    return [
      "<article class='timeline-card'>",
      "<div class='meta-row'><span class='tag'>" + escapeHtml(entry.tag) + "</span><span>" + escapeHtml(entry.city) + "</span><span>" + escapeHtml(entry.editoria) + "</span></div>",
      "<h3>" + escapeHtml(entry.title) + "</h3>",
      "<p class='story-sublead'>" + escapeHtml(getSublead(entry)) + "</p>",
      "<p class='story-lead'>" + escapeHtml(getLead(entry)) + "</p>",
      "<p class='story-source'>Fonte: <a href='" + escapeHtml(entry.source_url) + "'>" + escapeHtml(entry.source_label) + "</a>" + note + "</p>",
      renderDocumentTools(entry),
      renderAssistantLinks(entry),
      "</article>"
    ].join("");
  }

  function editoriaCards() {
    var counts = {};
    entries.forEach(function (entry) {
      counts[entry.editoria] = (counts[entry.editoria] || 0) + 1;
    });
    return Object.keys(counts)
      .sort(function (a, b) {
        if (counts[b] !== counts[a]) return counts[b] - counts[a];
        return a.localeCompare(b);
      })
      .map(function (key) {
        return "<div class='panel'><div class='panel-item'><span>" + escapeHtml(key) + "</span><strong>" + counts[key] + "</strong></div></div>";
      })
      .join("");
  }

  function lineList() {
    return entries
      .slice()
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.city !== b.city) return a.city.localeCompare(b.city);
        return a.title.localeCompare(b.title);
      })
      .map(function (entry) {
        return "<li><strong>" + escapeHtml(entry.city) + "</strong><span>" + escapeHtml(entry.line) + "</span></li>";
      })
      .join("");
  }

  function sourceList() {
    return DATA.sources.map(function (source) {
      return "<li><strong>" + escapeHtml(source.label) + "</strong><br><a href='" + escapeHtml(source.url) + "'>" + escapeHtml(source.url) + "</a></li>";
    }).join("");
  }

  function analysisStack() {
    return (DATA.analysis_stack || []).map(function (item, index) {
      var order = String(index + 1).padStart(2, "0");
      return [
        "<article class='flow-card'>",
        "<span class='flow-index'>" + order + "</span>",
        "<h3>" + escapeHtml(item.title) + "</h3>",
        "<p>" + escapeHtml(item.body) + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  function monthStatusLabel(status) {
    if (status === "active") return "ativo";
    if (status === "ready") return "pronto";
    return "aberto";
  }

  function yearBoard() {
    return (DATA.year_months || []).map(function (item) {
      var isCurrent = item.month === DATA.month;
      var tag = isCurrent ? "a" : "div";
      var attrs = isCurrent ? " href='" + MONTH_PAGE + "'" : "";
      return [
        "<" + tag + " class='year-card is-" + escapeHtml(item.status) + "'" + attrs + ">",
        "<span class='year-month'>" + escapeHtml(item.label) + "</span>",
        "<strong>" + escapeHtml(monthStatusLabel(item.status)) + "</strong>",
        "<small>" + escapeHtml(item.note) + "</small>",
        "</" + tag + ">"
      ].join("");
    }).join("");
  }

  function municipalityBoard() {
    var cities = {};
    entries.forEach(function (entry) {
      if (!cities[entry.city]) {
        cities[entry.city] = {
          city: entry.city,
          count: 0,
          latestDate: entry.date,
          latestLine: entry.line,
          latestTitle: entry.title,
          topEditoria: entry.editoria,
          topEditoriaCount: 0,
          editorias: {}
        };
      }

      var bucket = cities[entry.city];
      bucket.count += 1;
      bucket.editorias[entry.editoria] = (bucket.editorias[entry.editoria] || 0) + 1;

      if (entry.date > bucket.latestDate) {
        bucket.latestDate = entry.date;
        bucket.latestLine = entry.line;
        bucket.latestTitle = entry.title;
      }
    });

    Object.keys(cities).forEach(function (key) {
      var bucket = cities[key];
      Object.keys(bucket.editorias).forEach(function (editoria) {
        if (bucket.editorias[editoria] > bucket.topEditoriaCount) {
          bucket.topEditoria = editoria;
          bucket.topEditoriaCount = bucket.editorias[editoria];
        }
      });
    });

    return Object.keys(cities)
      .map(function (key) { return cities[key]; })
      .sort(function (a, b) {
        if (b.count !== a.count) return b.count - a.count;
        return a.city.localeCompare(b.city);
      })
      .map(function (item) {
        return [
          "<a class='municipality-item' href='" + dayUrl(item.latestDate) + "'>",
          "<div class='municipality-top'><strong>" + escapeHtml(item.city) + "</strong><span>" + item.count + " pauta(s)</span></div>",
          "<p>" + escapeHtml(item.latestLine) + "</p>",
          "<small>" + escapeHtml(item.topEditoria) + " | " + escapeHtml(formatAccessDate(item.latestDate)) + "</small>",
          "</a>"
        ].join("");
      })
      .join("");
  }

  function buildMiniCalendar() {
    var weekdayRow = ["S", "T", "Q", "Q", "S", "S", "D"].map(function (label) {
      return "<div class='mini-weekday'>" + label + "</div>";
    }).join("");

    var cells = [];
    var offset = (MONTH_START.getDay() + 6) % 7;
    var i;
    for (i = 0; i < offset; i += 1) {
      cells.push("<div class='mini-day is-empty'></div>");
    }

    for (i = 1; i <= DAYS_IN_MONTH; i += 1) {
      var value = dateText(i);
      var status = dayStatus(value);
      cells.push("<a class='mini-day is-" + status + "' href='" + dayUrl(value) + "'>" + i + "</a>");
    }

    return "<div class='mini-weekday-row'>" + weekdayRow + "</div><div class='mini-calendar-grid'>" + cells.join("") + "</div>";
  }

  function buildCalendar() {
    var weekdayRow = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map(function (label) {
      return "<div class='weekday'>" + label + "</div>";
    }).join("");

    var cells = [];
    var offset = (MONTH_START.getDay() + 6) % 7;
    var i;
    for (i = 0; i < offset; i += 1) {
      cells.push("<div class='day-chip is-empty'></div>");
    }

    for (i = 1; i <= DAYS_IN_MONTH; i += 1) {
      var value = dateText(i);
      var count = entryCount(value);
      var status = dayStatus(value);
      var caption = count > 0 ? count + " pauta(s)" : (status === "partial" ? "parcial" : "futuro");
      cells.push("<a class='day-chip is-" + status + "' href='" + dayUrl(value) + "'><strong>" + i + "</strong><small>" + caption + "</small></a>");
    }

    return "<div class='weekday-row'>" + weekdayRow + "</div><div class='calendar-grid'>" + cells.join("") + "</div>";
  }

  function dayBoard() {
    var cards = [];
    for (var day = 1; day <= DAYS_IN_MONTH; day += 1) {
      var value = dateText(day);
      var date = parseDate(value);
      var status = dayStatus(value);
      var list = grouped[value] || [];
      var note = list.length ? list[0].line : (status === "partial" ? "Sem pauta fechada nesta passada. Dia mantido aberto para segunda leitura." : "Data futura no calendario mensal. Aguardando publicacoes.");
      var countLabel = list.length ? (list.length + " pauta(s) no dia") : (status === "partial" ? "Rodada parcial" : "Aguardando publicacao");
      cards.push(
        "<a class='day-card is-" + status + "' href='" + dayUrl(value) + "'>" +
          "<span class='day-number'>" + day + "</span>" +
          "<h3>" + escapeHtml(longDate(date)) + "</h3>" +
          "<p>" + escapeHtml(note) + "</p>" +
          "<span class='count'>" + countLabel + "</span>" +
        "</a>"
      );
    }
    return cards.join("");
  }

  function renderMonthView() {
    document.title = DATA.site_title;
    var ranked = rankedEntries();
    var leadEntry = ranked[0] || null;
    var secondaryEntries = ranked.slice(1, 3);
    var nowEntries = ranked.slice(3, 9);
    var agendaEntries = ranked.filter(hasAgendaSignal).slice(0, 5);
    var daysWithEntries = Object.keys(grouped).length;
    var textExportFile = DATA.text_export ? DATA.text_export.file : "";
    var remoteLink = DATA.remote_url ? "<a class='top-link' href='" + escapeHtml(DATA.remote_url) + "' target='_blank' rel='noopener noreferrer'>Abrir versao remota</a>" : "";
    var textExportLink = textExportFile ? "<a class='top-link' href='" + escapeHtml(textExportFile) + "' target='_blank' rel='noopener noreferrer'>Abrir pautas em TXT</a>" : "";

    root.className = "front-page-root";
    root.innerHTML = [
      "<header class='news-header'>",
      "<div class='wrap news-header-inner'>",
      "<div class='news-branding'>",
      "<a class='brand-name' href='" + MONTH_PAGE + "'>PAUTEIRO!</a>",
      "<div class='brand-deck'><p class='eyebrow'>Noticias a partir dos diarios oficiais</p><p class='meta-line'>Edicao de " + formatAccessDate(DATA.updated_at) + " | " + daysWithEntries + " dias com pauta fechada nesta rodada</p></div>",
      "</div>",
      "<nav class='news-nav'><a href='#capa'>Capa</a><a href='#analise-2026'>Arquivo</a><a href='#editorias'>Editorias</a><a href='#agenda'>Agenda</a><a href='#municipios'>Municipios</a><a href='#atualizacao'>Atualizacao</a><a href='" + searchUrl({ year: String(DATA.year) }) + "'>Busca</a></nav>",
      "<div class='news-tools'>",
      "<a class='top-link' href='" + chronologyUrl() + "'>Cronologia</a>",
      "<a class='top-link' href='" + searchUrl({ year: String(DATA.year) }) + "'>Buscar arquivo</a>",
      textExportLink,
      "<a class='top-link' href='radar-diarios-goias-data.json'>Base</a>",
      remoteLink,
      "</div>",
      "</div>",
      "</header>",
      "<main class='wrap front-page'>",
      "<section class='hero-news-grid' id='capa'>",
      "<div class='hero-main-column'>" + renderHeroMain(leadEntry) + "</div>",
      "<div class='hero-side-column'>" + secondaryEntries.map(renderHeroSecondary).join("") + "</div>",
      "<aside class='hero-rail' id='agenda'>",
      "<div class='rail-block'><div class='rail-head'><p class='section-kicker'>Agora</p><h2>Radar do dia</h2></div><ul class='rail-list'>" + nowEntries.map(renderNowItem).join("") + "</ul></div>",
      "<div class='rail-block'><div class='rail-head'><p class='section-kicker'>Agenda publica</p><h2>O que pede seguimento</h2></div><ul class='rail-list agenda-list'>" + agendaEntries.map(renderAgendaItem).join("") + "</ul></div>",
      "<div class='rail-block compact-calendar-panel'><div class='rail-head'><p class='section-kicker'>Calendario</p><h2>Abril de 2026</h2></div>" + buildMiniCalendar() + "</div>",
      "</aside>",
      "</section>",
      renderAnnualAnalysisSection(),
      "<section class='news-section' id='editorias'>",
      "<div class='section-head'><div><p class='section-kicker'>Editorias</p><h2>O mapa do dia por assunto</h2></div><p class='section-intro'>A capa abre pelo peso noticioso. Abaixo, as pautas se reorganizam pela editoria que mais ajuda a leitura jornalistica.</p></div>",
      "<div class='editoria-deck'>" + renderEditoriaDeck(ranked) + "</div>",
      "</section>",
      "<section class='news-section' id='municipios'>",
      "<div class='section-head'><div><p class='section-kicker'>Municipios</p><h2>Territorios em foco</h2></div><p class='section-intro'>As frentes abaixo puxam as cidades e orgaos com mais densidade de pauta na rodada aberta.</p></div>",
      "<div class='city-spotlight-grid'>" + renderMunicipalitySpotlight(ranked) + "</div>",
      "</section>",
      "<section class='news-section'>",
      "<div class='section-head'><div><p class='section-kicker'>Radar interno</p><h2>Ferramentas da base</h2></div><p class='section-intro'>O jornal abre pela noticia. O restante da base continua acessivel para apuracao, navegacao por data e exportacao leve.</p></div>",
      "<div class='service-grid'>",
      "<a class='service-card' href='" + dayUrl("2026-04-08") + "'><strong>Dia com maior carga</strong><span>Abre a rodada de 08/04/2026 com as pautas mais densas da base atual.</span></a>",
      "<a class='service-card' href='" + chronologyUrl() + "'><strong>Cronologia</strong><span>Enxerga o mes como fluxo, em ordem cronologica crescente.</span></a>",
      "<a class='service-card' href='" + searchUrl({ year: String(DATA.year) }) + "'><strong>Pesquisa historica</strong><span>Consulta municipio, ano, tipo de diario, escopo e assunto dentro do arquivo.</span></a>",
      "<a class='service-card' href='" + escapeHtml(textExportFile || "#") + "'><strong>Pautas em TXT</strong><span>Leva lead e sublead para uso leve na redacao.</span></a>",
      (leadEntry ? "<a class='service-card' href='" + workflowUrl(leadEntry) + "'><strong>Mesa hibrida</strong><span>Prepara o pacote do NotebookLM, recebe o retorno manual e fecha o material para o chat.</span></a>" : ""),
      "<a class='service-card' href='radar-diarios-goias-data.json'><strong>Base documental</strong><span>Abre a base estruturada com os metadados de cada pauta.</span></a>",
      "</div>",
      "</section>",
      renderUpdateCadenceSection(),
      "</main>",
      "<footer class='footer'><div class='wrap'><p class='footer-note'>PAUTEIRO! publica a partir dos diarios oficiais e liga a pauta ao documento original, com marcador e data de acesso. A camada de apoio para GPT e NotebookLM segue disponivel em cada materia.</p></div></footer>"
    ].join("");
  }

  function renderChronologyView() {
    document.title = DATA.site_title + " | Cronologia";
    var dates = Object.keys(grouped).sort();
    var groups = dates.map(function (value) {
      var date = parseDate(value);
      var cards = grouped[value]
        .slice()
        .sort(function (a, b) {
          if ((b.highlight_score || 0) !== (a.highlight_score || 0)) return (b.highlight_score || 0) - (a.highlight_score || 0);
          return a.title.localeCompare(b.title);
        })
        .map(timelineCard)
        .join("");

      return [
        "<section class='timeline-group'>",
        "<div class='timeline-date'><strong>" + date.getDate() + "</strong><span>" + shortWeekday(date) + "</span><span>" + grouped[value].length + " pauta(s)</span></div>",
        "<div>" + cards + "</div>",
        "</section>"
      ].join("");
    }).join("");

    root.className = "wrap page-shell";
    root.innerHTML = [
      "<header class='page-header'>",
      "<div>",
      "<p class='eyebrow'>PAUTEIRO! | Cronologia</p>",
      "<h1 class='page-title'>Linha do tempo de abril de 2026</h1>",
      "<p class='intro'>Aqui a base aparece em ordem cronologica crescente. O objetivo e enxergar abril como fluxo editorial: o que entrou no inicio, onde o volume se concentrou e em quais datas o TJGO fez a curva subir.</p>",
      "<div class='nav-row'><a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar ao indice anual</a><a class='nav-pill' href='radar-diarios-goias-data.json'>Abrir base JSON</a></div>",
      "</div>",
      "<aside class='sidebar-card'>",
      "<h3>Recorte</h3>",
      "<p class='muted'>Preenchimento factual ate 18/04/2026. Dias sem pauta confirmada permanecem no calendario do indice mensal e podem receber nova rodada depois.</p>",
      "<div class='panel-item'><span>Pautas na cronologia</span><strong>" + entries.length + "</strong></div>",
      "<div class='panel-item'><span>Dias com entrada</span><strong>" + dates.length + "</strong></div>",
      "</aside>",
      "</header>",
      "<section class='section timeline'>" + groups + "</section>"
    ].join("");
  }

  function renderDayView() {
    var params = new URLSearchParams(window.location.search);
    var value = params.get("data") || DATA.month + "-01";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      value = DATA.month + "-01";
    }
    var current = parseDate(value);
    if (Number.isNaN(current.getTime())) {
      value = DATA.month + "-01";
      current = parseDate(value);
    }

    var list = grouped[value] || [];
    var status = dayStatus(value);
    var stateCopy = list.length ? (list.length + " pauta(s) confirmada(s) nesta data.") : (status === "future" ? "Data futura dentro da linha do tempo da base. A pagina ja fica pronta para a rodada quando o diario sair." : "Data lida de forma parcial nesta primeira passada, ainda sem pauta fechada com fator-noticia suficiente para entrar no card principal.");
    var previousDate = new Date(current.getTime());
    previousDate.setDate(previousDate.getDate() - 1);
    var nextDate = new Date(current.getTime());
    nextDate.setDate(nextDate.getDate() + 1);
    var prev = previousDate.toISOString().slice(0, 10);
    var next = nextDate.toISOString().slice(0, 10);
    var beats = list.length ? Array.from(new Set(list.map(function (entry) { return entry.editoria; }))).slice(0, 3).join(", ") : "Sem editoria dominante nesta data.";
    var mainContent;

    if (list.length) {
      mainContent = "<div class='story-stack'>" + storyCard(list[0], true) + list.slice(1).map(function (entry) { return storyCard(entry, false); }).join("") + "</div>";
    } else {
      mainContent = "<div class='empty-state'><h3>Dia sem fechamento principal</h3><p class='empty-copy'>" + escapeHtml(stateCopy) + "</p></div>";
    }

    document.title = DATA.site_title + " | " + value;
    root.className = "wrap page-shell";
    root.innerHTML = [
      "<header class='page-header'>",
      "<div>",
      "<p class='eyebrow'>PAUTEIRO! | Base diaria</p>",
      "<h1 class='page-title'>" + escapeHtml(longDate(current)) + "</h1>",
      "<p class='intro'>" + escapeHtml(stateCopy) + "</p>",
      "<div class='nav-row'>",
      "<a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar ao indice anual</a>",
      "<a class='nav-pill' href='" + chronologyUrl() + "'>Abrir cronologia</a>",
      (prev ? "<a class='nav-pill' href='" + dayUrl(prev) + "'>Dia anterior</a>" : ""),
      (next ? "<a class='nav-pill' href='" + dayUrl(next) + "'>Dia seguinte</a>" : ""),
      "</div>",
      "</div>",
      "<aside class='sidebar-card'>",
      "<h3>Resumo do dia</h3>",
      "<div class='panel-item'><span>Data</span><strong>" + value.slice(8, 10) + "/" + value.slice(5, 7) + "</strong></div>",
      "<div class='panel-item'><span>Pautas</span><strong>" + list.length + "</strong></div>",
      "<div class='panel-item'><span>Status</span><strong>" + (list.length ? "fechado" : (status === "future" ? "futuro" : "parcial")) + "</strong></div>",
      "<p class='panel-note'>Editorias mais visiveis: " + escapeHtml(beats) + "</p>",
      "</aside>",
      "</header>",
      "<section class='page-grid'>",
      "<div>" + mainContent + "</div>",
      "<aside class='note-stack'>",
      "<div class='note-card'><h3>Leitura editorial</h3><p class='muted'>Nesta pagina o foco e a data. Quando houver pauta confirmada, o primeiro card sobe como abertura do dia e os demais ficam empilhados logo abaixo.</p></div>",
      "<div class='note-card'><h3>Navegacao</h3><ul><li>Calendario no indice mensal para saltar entre datas.</li><li>Cronologia para enxergar o mes em ordem crescente.</li><li>TJGO marcado como eixo fixo da leitura pesada.</li></ul></div>",
      "</aside>",
      "</section>"
    ].join("");
  }

  function renderStoryView() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") || "";
    var entry = entryMap[id];

    if (!entry) {
      root.className = "wrap page-shell";
      root.innerHTML = "<div class='empty-state'><h3>Materia nao encontrada</h3><p class='empty-copy'>A pauta pedida nao aparece na base publica atual.</p></div>";
      return;
    }

    var paragraphs = storyBody(entry);
    var related = renderRelatedStories(entry);

    document.title = entry.title + " | " + DATA.project_name;
    root.className = "wrap page-shell";
    root.innerHTML = [
      "<article class='article-shell'>",
      "<header class='article-header'>",
      "<p class='eyebrow'>" + escapeHtml(entry.editoria) + " | " + escapeHtml(entry.city) + "</p>",
      "<h1 class='article-title'>" + escapeHtml(entry.title) + "</h1>",
      "<p class='article-sublead'>" + escapeHtml(getSublead(entry)) + "</p>",
      "<div class='article-meta'><span>" + escapeHtml(formatAccessDate(entry.date)) + "</span><span>" + escapeHtml(entry.source_label) + "</span></div>",
      renderImage(entry, "article-image"),
      "</header>",
      "<section class='article-page-grid'>",
      "<div class='article-body'>",
      paragraphs.map(function (paragraph, index) {
        var className = index === 0 ? "article-lead" : "article-paragraph";
        return "<p class='" + className + "'>" + escapeHtml(paragraph) + "</p>";
      }).join(""),
      "</div>",
      "<aside class='article-sidebar'>",
      "<div class='sidebar-card'><h3>Documento</h3><div class='panel-item'><span>Fonte</span><strong>" + escapeHtml(entry.source_label) + "</strong></div><div class='panel-item'><span>Marcador</span><strong>" + escapeHtml(getDocumentMarker(entry)) + "</strong></div><div class='panel-item'><span>Acesso</span><strong>" + escapeHtml(formatAccessDate(getAccessedAt(entry))) + "</strong></div><p class='story-source'><a href='" + escapeHtml(entry.source_url) + "' target='_blank' rel='noopener noreferrer'>Baixar documento original</a></p></div>",
      "<div class='sidebar-card'><h3>Apoio de apuracao</h3>" + renderAssistantLinks(entry) + "</div>",
      "<div class='sidebar-card'><h3>Fluxo Notebook + Chat</h3><p class='panel-note'>Abra a mesa hibrida para copiar o pacote do NotebookLM, colar o retorno manual e fechar o texto para o chat.</p><p class='story-source'><a href='" + workflowUrl(entry) + "'>Abrir mesa hibrida</a></p></div>",
      "<div class='sidebar-card'><h3>Outras do radar</h3><ul class='related-list'>" + related + "</ul></div>",
      "</aside>",
      "</section>",
      "<div class='article-nav'><a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar a capa</a><a class='nav-pill' href='" + dayUrl(entry.date) + "'>Abrir o dia</a><a class='nav-pill' href='" + chronologyUrl() + "'>Ver cronologia</a></div>",
      "</article>"
    ].join("");
  }

  function renderAssistantView() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") || "";
    var tool = params.get("tool") === "notebook" ? "notebook" : "gpt";
    var entry = entryMap[id];

    if (!entry) {
      root.className = "wrap page-shell";
      root.innerHTML = "<div class='empty-state'><h3>Pauta nao encontrada</h3><p class='empty-copy'>Esse link de texto assistido nao localizou a pauta na base atual.</p></div>";
      return;
    }

    var draft = assistantDraft(entry, tool);
    var toolLabel = tool === "notebook" ? "NotebookLM" : "GPT";
    var externalUrl = tool === "notebook" ? "https://notebooklm.google.com/" : "https://chatgpt.com/";

    document.title = DATA.site_title + " | " + toolLabel + " | " + entry.city;
    root.className = "wrap page-shell";
    root.innerHTML = [
      "<header class='page-header'>",
      "<div>",
      "<p class='eyebrow'>PAUTEIRO! | Texto assistido</p>",
      "<h1 class='page-title'>" + escapeHtml(entry.title) + "</h1>",
      "<p class='intro'>Aqui voce abre um texto-base por pauta. Ele nasce da base documental do PAUTEIRO! e ja fica pronto para levar ao " + escapeHtml(toolLabel) + " ou para reaproveitar na redacao.</p>",
      "<div class='nav-row'>",
      "<a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar ao indice</a>",
      "<a class='nav-pill' href='" + dayUrl(entry.date) + "'>Abrir o dia</a>",
      "<a class='nav-pill' href='" + workflowUrl(entry) + "'>Mesa hibrida</a>",
      "<a class='nav-pill' href='" + assistantUrl(entry, tool === "gpt" ? "notebook" : "gpt") + "'>Trocar de ferramenta</a>",
      "</div>",
      "</div>",
      "<aside class='sidebar-card'>",
      "<h3>Base da pauta</h3>",
      "<div class='panel-item'><span>Cidade</span><strong>" + escapeHtml(entry.city) + "</strong></div>",
      "<div class='panel-item'><span>Editoria</span><strong>" + escapeHtml(entry.editoria) + "</strong></div>",
      "<div class='panel-item'><span>Documento</span><strong>" + escapeHtml(entry.tag) + "</strong></div>",
      "<p class='panel-note'>" + escapeHtml(getDocumentMarker(entry)) + "</p>",
      "</aside>",
      "</header>",
      "<section class='assistant-page-grid'>",
      "<article class='assistant-draft-card'>",
      "<div class='assistant-card-head'><p class='section-kicker'>Texto " + escapeHtml(toolLabel) + "</p><h2>Saida pronta para copiar</h2></div>",
      "<pre class='assistant-draft' id='assistant-draft-text'>" + escapeHtml(draft) + "</pre>",
      "<div class='assistant-actions'>",
      "<button class='assistant-button' type='button' data-copy-text='" + escapeHtml(draft) + "'>Copiar texto</button>",
      "<a class='assistant-button is-link' href='" + escapeHtml(externalUrl) + "' target='_blank' rel='noopener noreferrer'>Abrir " + escapeHtml(toolLabel) + "</a>",
      "</div>",
      "</article>",
      "<aside class='note-stack'>",
      "<div class='note-card'><h3>Sublead</h3><p class='muted'>" + escapeHtml(getSublead(entry)) + "</p></div>",
      "<div class='note-card'><h3>Lead</h3><p class='muted'>" + escapeHtml(getLead(entry)) + "</p></div>",
      "<div class='note-card'><h3>Documento original</h3><p class='muted'>Fonte: " + escapeHtml(entry.source_label) + "</p><p class='story-source'><a href='" + escapeHtml(entry.source_url) + "' target='_blank' rel='noopener noreferrer'>Abrir documento</a></p></div>",
      "</aside>",
      "</section>"
    ].join("");

    var copyButton = root.querySelector("[data-copy-text]");
    if (copyButton && navigator.clipboard && navigator.clipboard.writeText) {
      copyButton.addEventListener("click", function () {
        navigator.clipboard.writeText(draft).then(function () {
          copyButton.textContent = "Texto copiado";
          window.setTimeout(function () {
            copyButton.textContent = "Copiar texto";
          }, 1600);
        });
      });
    }
  }

  function renderWorkflowView() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") || "";
    var entry = entryMap[id];

    if (!entry) {
      root.className = "wrap page-shell";
      root.innerHTML = "<div class='empty-state'><h3>Pauta nao encontrada</h3><p class='empty-copy'>A mesa hibrida nao encontrou essa pauta na base atual.</p></div>";
      return;
    }

    var packageText = notebookPackage(entry);
    var autoDraft = assistantDraft(entry, "gpt");
    var savedNotebookNotes = readNotebookNotes(entry);
    var finalBrief = buildFinalBrief(entry, savedNotebookNotes);
    var storageNote = storageAvailable() ? "O retorno do NotebookLM fica salvo localmente neste navegador." : "Este navegador nao liberou armazenamento local; copie o retorno manualmente antes de sair da pagina.";

    document.title = DATA.site_title + " | Mesa hibrida | " + entry.city;
    root.className = "wrap page-shell";
    root.innerHTML = [
      "<header class='page-header'>",
      "<div>",
      "<p class='eyebrow'>PAUTEIRO! | Mesa hibrida</p>",
      "<h1 class='page-title'>" + escapeHtml(entry.title) + "</h1>",
      "<p class='intro'>Aqui voce prepara o bruto para o NotebookLM, cola a leitura manual de volta no PAUTEIRO e sai com um fechamento pronto para levar ao chat.</p>",
      "<div class='nav-row'>",
      "<a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar a capa</a>",
      "<a class='nav-pill' href='" + storyUrl(entry) + "'>Abrir materia</a>",
      "<a class='nav-pill' href='" + assistantUrl(entry, "gpt") + "'>Texto GPT</a>",
      "<a class='nav-pill' href='" + assistantUrl(entry, "notebook") + "'>Texto NotebookLM</a>",
      "</div>",
      "</div>",
      "<aside class='sidebar-card'>",
      "<h3>Base da pauta</h3>",
      "<div class='panel-item'><span>Cidade</span><strong>" + escapeHtml(entry.city) + "</strong></div>",
      "<div class='panel-item'><span>Editoria</span><strong>" + escapeHtml(entry.editoria) + "</strong></div>",
      "<div class='panel-item'><span>Documento</span><strong>" + escapeHtml(entry.tag) + "</strong></div>",
      "<div class='panel-item'><span>Contexto bruto</span><strong>" + escapeHtml(documentContextLabel(entry)) + "</strong></div>",
      "<p class='panel-note'>" + escapeHtml(storageNote) + "</p>",
      "</aside>",
      "</header>",
      "<section class='workflow-page-grid'>",
      "<div class='workflow-main'>",
      "<article class='assistant-draft-card'>",
      "<div class='assistant-card-head'><p class='section-kicker'>Pacote de ida</p><h2>Material completo para o NotebookLM</h2></div>",
      "<pre class='assistant-draft' id='workflow-package-text'>" + escapeHtml(packageText) + "</pre>",
      "<div class='assistant-actions'>",
      "<button class='assistant-button' type='button' id='workflow-copy-package'>Copiar pacote</button>",
      "<button class='assistant-button' type='button' id='workflow-download-package'>Baixar TXT</button>",
      "<a class='assistant-button is-link' href='https://notebooklm.google.com/' target='_blank' rel='noopener noreferrer'>Abrir NotebookLM</a>",
      "</div>",
      "</article>",
      "<section class='workflow-compare-grid'>",
      "<article class='assistant-draft-card'>",
      "<div class='assistant-card-head'><p class='section-kicker'>Leitura automatica</p><h2>Saida base do PAUTEIRO</h2></div>",
      "<pre class='assistant-draft assistant-draft-compact'>" + escapeHtml(autoDraft) + "</pre>",
      "<div class='assistant-actions'><a class='assistant-button is-link' href='" + assistantUrl(entry, "gpt") + "'>Abrir versao GPT</a></div>",
      "</article>",
      "<article class='assistant-draft-card'>",
      "<div class='assistant-card-head'><p class='section-kicker'>Leitura manual</p><h2>Retorno do NotebookLM</h2></div>",
      "<textarea class='workflow-input' id='workflow-notebook-input' placeholder='Cole aqui a tua leitura do NotebookLM com achado principal, linha fina, datas, observacoes e pontos de apuracao.'>" + escapeHtml(savedNotebookNotes) + "</textarea>",
      "<div class='assistant-actions'>",
      "<button class='assistant-button' type='button' id='workflow-save-notebook'>Salvar leitura</button>",
      "<button class='assistant-button' type='button' id='workflow-clear-notebook'>Limpar</button>",
      "<span class='workflow-status' id='workflow-save-status'>" + escapeHtml(storageNote) + "</span>",
      "</div>",
      "</article>",
      "</section>",
      "</div>",
      "<aside class='note-stack'>",
      "<div class='sidebar-card'>" + renderCompletenessPanel(entry) + "</div>",
      "<div class='sidebar-card'><h3>Comparacao do retorno</h3><div id='workflow-metrics'>" + renderWorkflowMetrics(entry, savedNotebookNotes) + "</div></div>",
      "<article class='assistant-draft-card'>",
      "<div class='assistant-card-head'><p class='section-kicker'>Fechamento</p><h2>Pacote final para levar ao chat</h2></div>",
      "<pre class='assistant-draft' id='workflow-final-text'>" + escapeHtml(finalBrief) + "</pre>",
      "<div class='assistant-actions'>",
      "<button class='assistant-button' type='button' id='workflow-copy-final'>Copiar fechamento</button>",
      "<a class='assistant-button is-link' href='https://chatgpt.com/' target='_blank' rel='noopener noreferrer'>Abrir ChatGPT</a>",
      "</div>",
      "</article>",
      "<div class='note-card'><h3>Documento original</h3><p class='muted'>Fonte: " + escapeHtml(entry.source_label) + "</p><p class='muted'>Marcador: " + escapeHtml(getDocumentMarker(entry)) + "</p><p class='story-source'><a href='" + escapeHtml(getDocumentUrl(entry) || entry.source_url) + "' target='_blank' rel='noopener noreferrer'>Abrir documento</a></p></div>",
      "</aside>",
      "</section>"
    ].join("");

    var notebookInput = root.querySelector("#workflow-notebook-input");
    var saveStatus = root.querySelector("#workflow-save-status");
    var metricsContainer = root.querySelector("#workflow-metrics");
    var finalText = root.querySelector("#workflow-final-text");
    var copyPackageButton = root.querySelector("#workflow-copy-package");
    var downloadPackageButton = root.querySelector("#workflow-download-package");
    var saveNotebookButton = root.querySelector("#workflow-save-notebook");
    var clearNotebookButton = root.querySelector("#workflow-clear-notebook");
    var copyFinalButton = root.querySelector("#workflow-copy-final");

    function setStatus(message, tone) {
      if (!saveStatus) return;
      saveStatus.textContent = message;
      saveStatus.className = "workflow-status" + (tone ? " is-" + tone : "");
    }

    function refreshWorkflowPanels(notebookNotes) {
      metricsContainer.innerHTML = renderWorkflowMetrics(entry, notebookNotes);
      finalText.textContent = buildFinalBrief(entry, notebookNotes);
    }

    if (copyPackageButton && navigator.clipboard && navigator.clipboard.writeText) {
      copyPackageButton.addEventListener("click", function () {
        navigator.clipboard.writeText(packageText).then(function () {
          copyPackageButton.textContent = "Pacote copiado";
          window.setTimeout(function () {
            copyPackageButton.textContent = "Copiar pacote";
          }, 1600);
        });
      });
    }

    if (downloadPackageButton) {
      downloadPackageButton.addEventListener("click", function () {
        downloadTextFile("pauteiro-notebook-" + entry.entry_id + ".txt", packageText);
      });
    }

    if (notebookInput) {
      notebookInput.addEventListener("input", function () {
        refreshWorkflowPanels(notebookInput.value);
        setStatus("Texto alterado. Salve para manter este retorno no navegador.", "warn");
      });
    }

    if (saveNotebookButton) {
      saveNotebookButton.addEventListener("click", function () {
        if (!storageAvailable()) {
          setStatus("Sem armazenamento local. Copie o texto antes de sair.", "warn");
          return;
        }
        saveNotebookNotes(entry, notebookInput.value);
        refreshWorkflowPanels(notebookInput.value);
        setStatus("Leitura manual salva neste navegador.", "ok");
      });
    }

    if (clearNotebookButton) {
      clearNotebookButton.addEventListener("click", function () {
        notebookInput.value = "";
        clearNotebookNotes(entry);
        refreshWorkflowPanels("");
        setStatus("Leitura manual removida desta pauta.", "warn");
      });
    }

    if (copyFinalButton && navigator.clipboard && navigator.clipboard.writeText) {
      copyFinalButton.addEventListener("click", function () {
        navigator.clipboard.writeText(finalText.textContent).then(function () {
          copyFinalButton.textContent = "Fechamento copiado";
          window.setTimeout(function () {
            copyFinalButton.textContent = "Copiar fechamento";
          }, 1600);
        });
      });
    }
  }

  var pageParams = new URLSearchParams(window.location.search);
  var view = pageParams.get("view") || document.body.getAttribute("data-view") || "month";
  if (view === "chronology") {
    renderChronologyView();
  } else if (view === "search") {
    renderSearchView();
  } else if (view === "story") {
    renderStoryView();
  } else if (view === "assistant") {
    renderAssistantView();
  } else if (view === "workflow") {
    renderWorkflowView();
  } else if (view === "day") {
    renderDayView();
  } else {
    renderMonthView();
  }
})();
