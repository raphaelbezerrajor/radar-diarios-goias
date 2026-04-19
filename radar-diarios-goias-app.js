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

  function rankedEntries() {
    return entries
      .slice()
      .sort(function (a, b) {
        if ((b.highlight_score || 0) !== (a.highlight_score || 0)) return (b.highlight_score || 0) - (a.highlight_score || 0);
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return a.title.localeCompare(b.title);
      });
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
      "<nav class='news-nav'><a href='#capa'>Capa</a><a href='#editorias'>Editorias</a><a href='#agenda'>Agenda</a><a href='#municipios'>Municipios</a></nav>",
      "<div class='news-tools'>",
      "<a class='top-link' href='" + chronologyUrl() + "'>Cronologia</a>",
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
      "<a class='service-card' href='" + escapeHtml(textExportFile || "#") + "'><strong>Pautas em TXT</strong><span>Leva lead e sublead para uso leve na redacao.</span></a>",
      "<a class='service-card' href='radar-diarios-goias-data.json'><strong>Base documental</strong><span>Abre a base estruturada com os metadados de cada pauta.</span></a>",
      "</div>",
      "</section>",
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

  var pageParams = new URLSearchParams(window.location.search);
  var view = pageParams.get("view") || document.body.getAttribute("data-view") || "month";
  if (view === "chronology") {
    renderChronologyView();
  } else if (view === "story") {
    renderStoryView();
  } else if (view === "assistant") {
    renderAssistantView();
  } else if (view === "day") {
    renderDayView();
  } else {
    renderMonthView();
  }
})();
