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

  function assistantUrl(entry, tool) {
    return MONTH_PAGE + "?view=assistant&id=" + encodeURIComponent(entry.entry_id) + "&tool=" + encodeURIComponent(tool);
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

  function fallbackBlock(label) {
    var parts = String(label || "GO").split(/\s+/).filter(Boolean).slice(0, 2);
    var abbr = parts.map(function (item) { return item.charAt(0).toUpperCase(); }).join("") || "GO";
    return "<div class='story-image fallback'>" + escapeHtml(abbr) + "</div>";
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

  function getDocumentLinkLabel(entry) {
    return entry.document_url ? "Abrir documento original" : "Abrir fonte original";
  }

  function getDocumentMarker(entry) {
    return entry.page_marker || entry.source_note || "Marcador a confirmar no documento original";
  }

  function getAccessedAt(entry) {
    return entry.accessed_at || DATA.accessed_at || DATA.updated_at || "";
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
      "</div>"
    ].join("");
  }

  function lowerFirst(value) {
    if (!value) return "";
    return value.charAt(0).toLowerCase() + value.slice(1);
  }

  function gptDraft(entry) {
    return [
      "Lead inicial para abertura:",
      entry.summary,
      "",
      "Enquadramento sugerido:",
      "Em " + formatAccessDate(entry.date) + ", " + entry.city + " entrou no radar com uma publicacao de " + lowerFirst(entry.tag) + " na editoria de " + lowerFirst(entry.editoria) + ". O dado central da pauta e que " + lowerFirst(entry.line),
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
      entry.summary,
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

  function renderImage(entry) {
    if (entry.image_url) {
      return "<img class='story-image' loading='lazy' src='" + escapeHtml(entry.image_url) + "' alt='" + escapeHtml("Imagem relacionada a " + entry.city) + "'>";
    }
    return fallbackBlock(entry.city);
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
      "<p class='story-line'>" + escapeHtml(entry.line) + "</p>",
      "<p class='story-summary'>" + escapeHtml(entry.summary) + "</p>",
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
      "<p class='story-line'>" + escapeHtml(entry.line) + "</p>",
      "<p>" + escapeHtml(entry.summary) + "</p>",
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
    var highlights = entries
      .slice()
      .sort(function (a, b) {
        if ((b.highlight_score || 0) !== (a.highlight_score || 0)) return (b.highlight_score || 0) - (a.highlight_score || 0);
        return b.date.localeCompare(a.date);
      })
      .slice(0, 6);

    var editoriasCount = new Set(entries.map(function (entry) { return entry.editoria; })).size;
    var daysWithEntries = Object.keys(grouped).length;
    var monthsInYear = (DATA.year_months || []).length || 12;
    var cityCount = new Set(entries.map(function (entry) { return entry.city; })).size;
    var leadEntry = highlights[0] || null;
    var secondaryFeatures = highlights.slice(1, 4);
    var leadCard = leadEntry ? storyCard(leadEntry, true) : "<div class='empty-state'><h3>Base em montagem</h3><p class='empty-copy'>A primeira manchete principal entra aqui quando a rodada do dia estiver fechada.</p></div>";
    var features = secondaryFeatures.length ? secondaryFeatures.map(function (entry) { return storyCard(entry, false); }).join("") : "";
    var textExportFile = DATA.text_export ? DATA.text_export.file : "";
    var remoteLink = DATA.remote_url ? "<a class='top-link' href='" + escapeHtml(DATA.remote_url) + "' target='_blank' rel='noopener noreferrer'>Abrir versao remota</a>" : "";
    var textExportLink = textExportFile ? "<a class='top-link' href='" + escapeHtml(textExportFile) + "' target='_blank' rel='noopener noreferrer'>Abrir pautas em TXT</a>" : "";

    root.className = "";
    root.innerHTML = [
      "<header class='topbar'>",
      "<div class='wrap'>",
      "<div class='masthead'>",
      "<div class='masthead-copy'>",
      "<p class='eyebrow'>PAUTEIRO! | Livro de pautas 2026</p>",
      "<h1 class='title'>Livro de pautas para ler diarios, marcar agenda e devolver texto pronto de redacao</h1>",
      "<p class='intro'>Abril abriu a frente publica do PAUTEIRO! com recorte factual ate 18 de abril de 2026. O resto do ano ja fica armado para crescer por mes, por municipio, por editoria e depois por agenda derivada de editais, sessoes e prazos.</p>",
      "<p class='meta-line'>Atualizado em 18 de abril de 2026. A leitura assistida entra para acelerar triagem e lead, nao para substituir curadoria.</p>",
      "<div class='chip-row'>",
      "<span class='chip'>ChatGPT e NotebookLM entram na camada assistida de leitura e devolucao de pautas.</span>",
      "<span class='chip'>Gemini fica como camada opcional de comparacao.</span>",
      "<span class='chip'>" + daysWithEntries + " dias ja tem pauta fechada nesta rodada.</span>",
      "</div>",
      "</div>",
      "<div class='top-links'>",
      "<a class='top-link' href='" + chronologyUrl() + "'>Abrir cronologia completa</a>",
      textExportLink,
      "<a class='top-link' href='radar-diarios-goias-data.json'>Abrir base JSON</a>",
      "<a class='top-link' href='" + dayUrl("2026-04-08") + "'>Abrir dia com maior carga</a>",
      remoteLink,
      "</div>",
      "</div>",
      "<section class='newsdesk-grid'>",
      "<div class='lead-stage'>",
      "<div class='desk-head'><p class='panel-kicker'>Abertura principal</p><p class='desk-note'>A pauta de maior escala abre a capa do caderno.</p></div>",
      leadCard,
      "</div>",
      "<aside class='municipality-panel panel'>",
      "<div class='desk-head'><p class='panel-kicker'>Por municipio</p><p class='desk-note'>" + cityCount + " cidades ou frentes territoriais com pauta nesta base.</p></div>",
      "<div class='municipality-list'>" + municipalityBoard() + "</div>",
      "</aside>",
      "<aside class='utility-rail'>",
      "<div class='panel utility-card'>",
      "<p class='panel-kicker'>Pulso da base</p>",
      "<div class='panel-item'><span>Fontes</span><strong>" + DATA.sources.length + "</strong></div>",
      "<div class='panel-item'><span>Paginas e atos</span><strong>" + DATA.evaluated_units + "</strong></div>",
      "<div class='panel-item'><span>Pautas</span><strong>" + entries.length + "</strong></div>",
      "<div class='panel-item'><span>Editorias</span><strong>" + editoriasCount + "</strong></div>",
      "<div class='panel-item'><span>Meses armados</span><strong>" + monthsInYear + "</strong></div>",
      "</div>",
      "<div class='calendar-panel compact-calendar-panel'>",
      "<p class='panel-kicker'>Abril de 2026</p>",
      "<p class='calendar-note'>Calendario compacto para navegar a rodada.</p>",
      buildMiniCalendar(),
      "</div>",
      "</aside>",
      "</section>",
      "</div>",
      "</header>",
      "<main class='wrap'>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Publicacoes em destaque</p><h2>Manchetes que abrem o livro de pautas</h2></div><p class='section-intro'>Aqui entram as aberturas secundarias da capa, ja em formato de agencia e com o documento original amarrado ao card.</p></div>",
      "<div class='feature-grid'>" + features + "</div>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Fluxo do sistema</p><h2>Como o PAUTEIRO! funciona</h2></div><p class='section-intro'>A ideia e transformar diario em agenda, agenda em pauta e pauta em texto de saida. A camada assistida por IA entra no meio do processo, nao no lugar da curadoria jornalistica.</p></div>",
      "<div class='flow-grid'>" + analysisStack() + "</div>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Caderno 2026</p><h2>Estrutura anual pronta para receber os proximos meses</h2></div><p class='section-intro'>Abril ja esta povoado. Os outros meses entram como caderno aberto, para a base crescer sem desmontar o produto nem pesar demais a navegacao.</p></div>",
      "<div class='year-grid'>" + yearBoard() + "</div>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Dias de abril</p><h2>Base organizada por dia</h2></div><p class='section-intro'>Cada data abre uma pagina propria, com navegacao entre dias, resumo do que entrou e alerta quando a rodada ainda esta parcial.</p></div>",
      "<div class='day-board'>" + dayBoard() + "</div>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Editorias</p><h2>Separacao automatica por assunto</h2></div><p class='section-intro'>A contagem abaixo olha para a vocacao principal da pauta, nao apenas para o orgao que publicou o ato.</p></div>",
      "<div class='editoria-grid'>" + editoriaCards() + "</div>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Linha fina</p><h2>Assuntos do mes em uma passada curta</h2></div><p class='section-intro'>A exportacao leve em TXT leva as pautas em texto corrido, com linha fina e lead para uso de redacao.</p></div>",
      "<ul class='line-list'>" + lineList() + "</ul>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Fontes fixas</p><h2>Familias de fonte que sustentam a base</h2></div><p class='section-intro'>O TJGO entra aqui como frente propria de leitura pesada. A pagina do DJE fica indexada e as noticias oficiais do tribunal ajudam a puxar atos para leitura posterior no diario.</p></div>",
      "<ul class='sources-list'>" + sourceList() + "</ul>",
      "</section>",
      "</main>",
      "<footer class='footer'><div class='wrap'><p class='footer-note'>PAUTEIRO! roda a partir de <a href='radar-diarios-goias-data.json'>radar-diarios-goias-data.json</a> e da saida leve <a href='" + escapeHtml(textExportFile || "#") + "'>pauteiro-2026-pautas.txt</a>. Abril esta preenchido ate 18 de abril de 2026; o caderno anual segue aberto para as proximas rodadas.</p></div></footer>"
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
    if (Number.isNaN(current.getTime()) || current.getMonth() !== MONTH_START.getMonth()) {
      value = DATA.month + "-01";
      current = parseDate(value);
    }

    var list = grouped[value] || [];
    var status = dayStatus(value);
    var stateCopy = list.length ? (list.length + " pauta(s) confirmada(s) nesta data.") : (status === "future" ? "Data futura dentro do calendario mensal. A base ja deixa a pagina pronta para a rodada quando o diario sair." : "Data lida de forma parcial nesta primeira passada, ainda sem pauta fechada com fator-noticia suficiente para entrar no card principal.");
    var dayNumber = Number(value.slice(-2));
    var prev = dayNumber > 1 ? dateText(dayNumber - 1) : "";
    var next = dayNumber < DAYS_IN_MONTH ? dateText(dayNumber + 1) : "";
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
      "<div class='note-card'><h3>Linha fina</h3><p class='muted'>" + escapeHtml(entry.line) + "</p></div>",
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

  var pageParams = new URLSearchParams(window.location.search);
  var view = pageParams.get("view") || document.body.getAttribute("data-view") || "month";
  if (view === "chronology") {
    renderChronologyView();
  } else if (view === "assistant") {
    renderAssistantView();
  } else if (view === "day") {
    renderDayView();
  } else {
    renderMonthView();
  }
})();
