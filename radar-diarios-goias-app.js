(function () {
  var DATA = window.RADAR_GO_DATA;
  var root = document.getElementById("app");

  if (!DATA || !root) {
    return;
  }

  var MONTH_PAGE = "radar-diarios-goias.html";
  var MONTH_START = new Date(DATA.month + "-01T00:00:00");
  var CUTOFF = new Date(DATA.cutoff_date + "T00:00:00");
  var DAYS_IN_MONTH = new Date(MONTH_START.getFullYear(), MONTH_START.getMonth() + 1, 0).getDate();

  var entries = DATA.entries.slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if ((b.highlight_score || 0) !== (a.highlight_score || 0)) return (b.highlight_score || 0) - (a.highlight_score || 0);
    return a.title.localeCompare(b.title);
  });

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
        return "<li><strong>" + escapeHtml(entry.city) + "</strong>" + escapeHtml(entry.line) + "</li>";
      })
      .join("");
  }

  function sourceList() {
    return DATA.sources.map(function (source) {
      return "<li><strong>" + escapeHtml(source.label) + "</strong><br><a href='" + escapeHtml(source.url) + "'>" + escapeHtml(source.url) + "</a></li>";
    }).join("");
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
    var features = highlights.map(function (entry, index) { return storyCard(entry, index === 0); }).join("");

    root.className = "";
    root.innerHTML = [
      "<header class='topbar'>",
      "<div class='wrap top-grid'>",
      "<div>",
      "<p class='eyebrow'>Radar Diario GO | Base por dia</p>",
      "<h1 class='title'>Abril de 2026 virou base diaria, com calendario, cronologia e frente propria para o TJGO</h1>",
      "<p class='intro'>Estrutura mensal organizada para o periodo de 1 a 30 de abril de 2026, com preenchimento factual ate 18 de abril de 2026. O recorte prioriza fator-noticia em contratos, compras, estruturas de gestao, plantoes judiciais, obras, habitacao, saude e atos de tribunal.</p>",
      "<p class='meta-line'>Atualizado em 18 de abril de 2026. Dias 19 a 30 permanecem no calendario como placeholders da rodada futura.</p>",
      "<div class='stats'>",
      "<div class='stat'><strong>" + DATA.sources.length + "</strong><span>fontes oficiais e familias de leitura nesta base mensal.</span></div>",
      "<div class='stat'><strong>" + DATA.evaluated_units + "</strong><span>paginas, edicoes e atos efetivamente abertos nesta passada de abril.</span></div>",
      "<div class='stat'><strong>" + entries.length + "</strong><span>pautas com potencial claro de noticia ate 18 de abril de 2026.</span></div>",
      "<div class='stat'><strong>" + editoriasCount + "</strong><span>editorias separadas com contagem automatica da base diaria.</span></div>",
      "</div>",
      "<div class='chip-row'>",
      "<span class='chip'>Justica e DJE do TJGO entram como eixo fixo da leitura pesada.</span>",
      "<span class='chip'>Base separada por dia com pagina diaria e cronologia completa.</span>",
      "<span class='chip'>" + daysWithEntries + " dias ja tem pauta fechada na rodada atual.</span>",
      "</div>",
      "<div class='top-links'>",
      "<a class='top-link' href='" + chronologyUrl() + "'>Abrir cronologia completa</a>",
      "<a class='top-link' href='radar-diarios-goias-data.json'>Abrir base JSON</a>",
      "<a class='top-link' href='" + dayUrl("2026-04-08") + "'>Abrir dia com maior carga</a>",
      "</div>",
      "</div>",
      "<aside class='calendar-panel'>",
      "<p class='panel-kicker'>Calendario na rodada</p>",
      "<h2>" + capitalize(monthName(MONTH_START.getMonth())) + " " + MONTH_START.getFullYear() + "</h2>",
      "<p class='calendar-note'>Clique em qualquer data. Dias com pauta confirmada ficam em verde; dias lidos sem fechamento ficam em dourado; datas futuras ficam em cinza.</p>",
      buildCalendar(),
      "</aside>",
      "</div>",
      "</header>",
      "<main class='wrap'>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Publicacoes em destaque</p><h2>Manchetes que abriram a base mensal</h2></div><p class='section-intro'>Esses cards puxam o mes pelo que tem escala, valor, efeito administrativo ou repercussao institucional mais nitida. O bloco segue em formato de agencia, com foto quando a base ja trouxe um credito usavel.</p></div>",
      "<div class='feature-grid'>" + features + "</div>",
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
      "<div class='section-head'><div><p class='section-kicker'>Linha fina</p><h2>Assuntos do mes em uma passada curta</h2></div></div>",
      "<ul class='line-list'>" + lineList() + "</ul>",
      "</section>",
      "<section class='section'>",
      "<div class='section-head'><div><p class='section-kicker'>Fontes fixas</p><h2>Familias de fonte que sustentam a base</h2></div><p class='section-intro'>O TJGO entra aqui como frente propria de leitura pesada. A pagina do DJE fica indexada e as noticias oficiais do tribunal ajudam a puxar atos para leitura posterior no diario.</p></div>",
      "<ul class='sources-list'>" + sourceList() + "</ul>",
      "</section>",
      "</main>",
      "<footer class='footer'><div class='wrap'><p class='footer-note'>Base mensal gerada a partir de <a href='radar-diarios-goias-data.json'>radar-diarios-goias-data.json</a>. Recorte factual preenchido ate 18 de abril de 2026. O calendario ja cobre o mes inteiro para receber novas rodadas sem desmontar o template.</p></div></footer>"
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
      "<p class='eyebrow'>Cronologia do mes</p>",
      "<h1 class='page-title'>Linha do tempo de abril de 2026</h1>",
      "<p class='intro'>Aqui a base aparece em ordem cronologica crescente. O objetivo e enxergar o mes como fluxo: o que entrou no inicio, onde o volume se concentrou e em quais datas o TJGO fez a curva subir.</p>",
      "<div class='nav-row'><a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar ao indice mensal</a><a class='nav-pill' href='radar-diarios-goias-data.json'>Abrir base JSON</a></div>",
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
      "<p class='eyebrow'>Base diaria</p>",
      "<h1 class='page-title'>" + escapeHtml(longDate(current)) + "</h1>",
      "<p class='intro'>" + escapeHtml(stateCopy) + "</p>",
      "<div class='nav-row'>",
      "<a class='nav-pill' href='" + MONTH_PAGE + "'>Voltar ao mes</a>",
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

  var pageParams = new URLSearchParams(window.location.search);
  var view = pageParams.get("view") || document.body.getAttribute("data-view") || "month";
  if (view === "chronology") {
    renderChronologyView();
  } else if (view === "day") {
    renderDayView();
  } else {
    renderMonthView();
  }
})();
