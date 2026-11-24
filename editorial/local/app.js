const $ = (id) => document.getElementById(id);
const fields = {
  city: $("city"), date: $("date"), scope: $("scope"), type: $("type"), importance: $("importance"),
  title: $("title"), deck: $("deck"), body: $("body"), sourceLabel: $("source-label"),
  documentReference: $("reference"), sourceUrl: $("source-url")
};
let state = { stories: [], overrides: [], placements: [], drafts: [], csrf: "", siteBase: "/radar-diarios-goias/" };
let selectedId = null;
let selectedKind = "edit";
let selectedSourceHash = "";
let selectedPath = "";
let working = false;
let reviewSnapshot = "";

function articleParagraph(text) {
  text = String(text);
  const paragraph = document.createElement("p");
  const citation = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  let offset = 0;
  for (const match of text.matchAll(citation)) {
    paragraph.append(text.slice(offset, match.index));
    const link = document.createElement("a");
    link.href = match[2];
    link.textContent = match[1];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    paragraph.append(link);
    offset = match.index + match[0].length;
  }
  paragraph.append(text.slice(offset));
  return paragraph;
}

async function refreshReview() {
  try {
    const response = await fetch("/api/review", { cache: "no-store" });
    if (!response.ok) throw new Error("Fila indisponível.");
    const queue = await response.json();
    const count = queue.items.length;
    $("review-count").textContent = (count === 1 ? "1 matéria pendente" : `${count} matérias pendentes`)
      + (queue.unreadable ? ` · ${queue.unreadable} ficha(s) com erro de leitura` : "");
    const incoming = queue.incoming || [];
    const batch = incoming.filter(item => item.nextBatch);
    const investigate = incoming.filter(item => item.status === "investigate" && !item.nextBatch);
    const watch = incoming.filter((item) => item.status === "watch");
    $("review-intake-label").textContent = `${incoming.length} atos triados automaticamente`;
    $("review-batch-label").textContent = `Próximo lote de apuração (${batch.length})`;
    $("review-investigate-label").textContent = `Na sequência para apuração (${investigate.length})`;
    $("review-watch-label").textContent = `Em acompanhamento (${watch.length})`;
    $("review-intake-date").textContent = queue.generatedAt
      ? `Fila gerada em ${new Date(queue.generatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
      : "A curadoria ainda não informou a data da fila.";
    const snapshot = JSON.stringify([queue.items, incoming]);
    if (snapshot === reviewSnapshot) return;
    const list = $("review-list");
    const intakeList = $("review-intake-list");
    const opened = new Set([...$("revisao").querySelectorAll("details[data-id][open]")].map((item) => item.dataset.id));
    const renderItem = (item) => {
      const article = document.createElement("details");
      article.dataset.id = item.id;
      article.open = opened.has(item.id);
      const summary = document.createElement("summary");
      summary.textContent = item.title;
      const meta = document.createElement("small");
      const stage = item.status === "investigate" ? "Aguardando apuração" : item.status === "watch" ? "Em acompanhamento"
        : item.stage === "em_apuracao" ? "Em apuração" : item.status === "needs_review" ? "Revisão humana" : "Rascunho";
      meta.textContent = [stage, Number.isFinite(item.priority) ? `Prioridade ${item.priority}/100` : "", item.date].filter(Boolean).join(" · ");
      summary.append(meta);
      const review = document.createElement("section");
      review.className = "review-pending";
      const reason = document.createElement("h3");
      reason.textContent = "Por que ainda não foi para edição";
      const explanation = item.reason || (item.status === "needs_review"
        ? "A pauta aguarda revisão humana. A ficha não traz um motivo específico além das verificações registradas abaixo."
        : "O rascunho aguarda avaliação editorial. Confira as pendências registradas abaixo.");
      review.append(reason, articleParagraph(explanation));
      if (item.selectedBecause?.length) {
        review.append(articleParagraph(`Critérios da triagem — ${item.selectedBecause.join(", ")}.`));
      }
      const next = document.createElement("h3");
      next.textContent = "O que falta para avançar";
      review.append(next);
      const checks = [...new Set([...(item.pendingChecks || []), ...(item.questions || [])])];
      if (checks.length) {
        const list = document.createElement("ul");
        for (const check of checks) {
          const row = document.createElement("li");
          row.textContent = check;
          list.append(row);
        }
        review.append(list);
      } else {
        review.append(articleParagraph("A ficha ainda não registra pendências específicas."));
      }
      const deck = document.createElement("p");
      deck.className = "review-deck";
      deck.textContent = item.deck || "";
      article.append(summary, review);
      if (item.deck) article.append(deck);
      article.append(...item.paragraphs.map(articleParagraph));
      if (/^https?:\/\//i.test(item.sourceUrl || "")) {
        const source = document.createElement("a");
        source.href = item.sourceUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Abrir documento oficial ↗";
        article.append(source);
      }
      if (item.withdrawnFromSite) {
        const open = document.createElement("button");
        open.type = "button";
        open.textContent = "Abrir na mesa de edição";
        open.addEventListener("click", async () => {
          if (!state.stories.some(row => row.id === item.id)) await refresh();
          selectStory(item.id);
          $("editor-heading").scrollIntoView({block:"start"});
        });
        article.append(open);
      }
      return article;
    };
    list.replaceChildren(...queue.items.map(renderItem));
    $("review-batch-list").replaceChildren(...batch.map(renderItem));
    $("review-investigate-list").replaceChildren(...investigate.map(renderItem));
    intakeList.replaceChildren();
    let visible = 0;
    function moreWatched() {
      const group = watch.slice(visible, visible + 30);
      visible += group.length;
      intakeList.append(...group.map(renderItem));
      if (visible < watch.length) {
        const more = document.createElement("button");
        more.type = "button";
        more.textContent = "Ver mais atos em acompanhamento";
        more.addEventListener("click", () => { more.remove(); moreWatched(); });
        intakeList.append(more);
      }
    }
    moreWatched();
    reviewSnapshot = snapshot;
  } catch {
    $("review-count").textContent = "Fila indisponível. A redação tentará atualizar novamente.";
  }
}

function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}

function today() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function paragraphs() {
  return fields.body.value.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
}

function currentEntry() {
  return {
    kind: selectedKind, id: selectedId,
    sectionId: $("section-id").value, placement: $("placement").value,
    relatedTo: $("related-to").disabled ? "" : $("related-to").value,
    city: fields.city.value.trim(), date: fields.date.value, scope: fields.scope.value,
    type: fields.type.value.trim(), importance: Number(fields.importance.value) || 80,
    title: fields.title.value.trim(), deck: fields.deck.value.trim(), paragraphs: paragraphs(),
    sourceLabel: fields.sourceLabel.value.trim(), sourceUrl: fields.sourceUrl.value.trim(),
    sourceHash: selectedSourceHash, documentReference: fields.documentReference.value.trim()
  };
}

function renderPreview() {
  if (!selectedId) return;
  $("preview").hidden = false;
  $("preview-title").textContent = fields.title.value || "Título da matéria";
  $("preview-deck").textContent = fields.deck.value || "Olho da matéria";
  const container = $("preview-body");
  container.replaceChildren();
  for (const paragraph of paragraphs()) {
    const node = document.createElement("p");
    node.textContent = paragraph;
    container.appendChild(node);
  }
}

function updateRelated(parentId = "", query = "") {
  const exclusive = $("placement").value === "relacionada";
  $("also-related-field").hidden = exclusive;
  const enabled = exclusive || $("also-related").checked;
  $("related-field").hidden = !enabled;
  const select = $("related-to");
  select.disabled = !enabled;
  select.required = enabled;
  select.replaceChildren(new Option("Escolha a matéria principal", ""));
  if (!enabled) return;
  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const term = normalize(query.trim());
  const internal = new Set(state.placements.filter(p => p.placement === "relacionada").map(p => p.id));
  const choices = document.createDocumentFragment();
  for (const story of state.stories) {
    if (story.id !== selectedId && story.distributionEligible && !internal.has(story.id)) {
      const label = story.title + " · " + story.date + " · " + story.city;
      if (!term || story.id === parentId || normalize(label).includes(term)) choices.append(new Option(label, story.id));
    }
  }
  select.append(choices);
  select.value = parentId;
}

function setFields(item) {
  $("section-id").value = item.sectionId || "";
  $("placement").value = item.placement || "editoria";
  $("also-related").checked = Boolean(item.relatedTo && item.placement !== "relacionada");
  $("related-search").value = "";
  updateRelated(item.relatedTo);
  $("apply-placement").hidden = !state.stories.some(s => s.id === selectedId && s.distributionEligible);
  fields.city.value = item.city || "";
  fields.date.value = /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? item.date : "";
  fields.scope.value = item.scope === "Estadual" ? "Estadual" : "Municipal";
  fields.type.value = item.type || "Ato público";
  fields.importance.value = Number(item.importance) || 80;
  fields.title.value = item.title || "";
  fields.deck.value = item.deck || "";
  fields.body.value = (item.paragraphs || []).join("\n\n");
  fields.sourceLabel.value = item.sourceLabel || "";
  fields.documentReference.value = item.documentReference || "";
  fields.sourceUrl.value = item.sourceUrl || "";
  selectedSourceHash = item.sourceHash || "";
  $("verified").checked = false;
  const locked = selectedKind === "edit";
  for (const element of [fields.city, fields.date, fields.type, fields.importance, fields.sourceLabel, fields.documentReference, fields.sourceUrl]) element.readOnly = locked;
  fields.scope.disabled = locked;
  $("source-note").textContent = locked ? "A identificação e o link da fonte ficam bloqueados nesta edição." : "Informe o endereço direto do documento oficial e a edição ou página consultada.";
  $("source-link").hidden = !/^https:\/\//i.test(item.sourceUrl || "");
  if (!$("source-link").hidden) $("source-link").href = item.sourceUrl;
  $("page-link").hidden = !selectedPath;
  if (selectedPath) $("page-link").href = state.siteBase.replace(/\/$/, "") + selectedPath;
  $("mode").textContent = selectedKind === "new" ? "Matéria nova" : "Matéria existente";
  $("editor-heading").textContent = selectedKind === "new" ? "Escrever matéria" : "Editar matéria";
  $("empty").hidden = true;
  $("editor").hidden = false;
  renderPreview();
}

function selectStory(id) {
  const story = state.stories.find((item) => item.id === id);
  if (story?.recordType === "record") {
    const draftId = `pauteiro-${story.id}`;
    if (state.stories.some(item => item.id === draftId && item.recordType === "story")) return selectStory(draftId);
    const draft = state.drafts.find((item) => item.id === draftId);
    selectedId = draftId;
    selectedKind = "new";
    selectedPath = story.reportingCandidate ? "" : story.path || "";
    setFields({ ...story, title: "", deck: "", paragraphs: [], ...draft, id: draftId });
    status(draft ? "Rascunho local carregado." : "Ato do acervo carregado. Confira o documento e escreva a matéria; o registro original será preservado.");
    return;
  }
  const override = state.overrides.find((item) => item.id === id);
  const draft = state.drafts.find((item) => item.id === id);
  if (!story && !override && !draft) return;
  selectedId = id;
  selectedKind = draft?.kind || override?.kind || (story?.editorialEntryId ? "new" : "edit");
  selectedPath = story?.path || "";
  const placement = state.placements.find(p => p.id === id);
  setFields({ ...story, ...override, ...placement, ...draft });
  $("list").querySelectorAll("button").forEach((button) => button.setAttribute("aria-current", button.dataset.id === id ? "true" : "false"));
  status(draft ? "Rascunho local carregado." : "Matéria carregada.");
}

function newStory() {
  selectedId = `pauteiro-${crypto.randomUUID()}`;
  selectedKind = "new";
  selectedPath = "";
  setFields({ id: selectedId, date: today(), importance: 80, type: "Ato público" });
  status("Nova matéria. Comece pelo documento oficial.");
}

function renderList() {
  const query = $("search").value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const draftsById = new Map(state.drafts.map((item) => [item.id, item]));
  const merged = [
    ...state.stories.map((item) => ({ ...item, draft: draftsById.has(item.id) })),
    ...state.drafts.filter((item) => !state.stories.some((story) => story.id === item.id)).map((item) => ({ ...item, draft: true }))
  ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || (Number(b.importance) || 0) - (Number(a.importance) || 0));
  const kind = $("catalog-filter").value;
  const matching = merged.filter(item => {
    if (kind === "candidate" && !item.reportingCandidate) return false;
    if (kind === "draft" && !item.draft) return false;
    if (["story", "record"].includes(kind) && item.recordType !== kind) return false;
    return !query || [item.title, item.city, item.id, item.date, item.documentReference].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query);
  });
  $("count").textContent = `${matching.length} de ${merged.length} atos, matérias e rascunhos`;
  const list = $("list");
  list.replaceChildren();
  for (const item of matching.slice(0, 100)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = item.id;
    button.setAttribute("aria-current", item.id === selectedId ? "true" : "false");
    button.textContent = item.title || "Rascunho sem título";
    const meta = document.createElement("small");
    meta.textContent = `${item.city || "Sem cidade"} · ${item.date || "Sem data"} · ${item.draft ? "Rascunho" : item.reportingCandidate ? "Documento para apurar" : item.recordType === "record" ? "Registro documental" : "Matéria publicada"}`;
    button.appendChild(meta);
    button.addEventListener("click", () => selectStory(item.id));
    list.appendChild(button);
  }
}

async function refresh() {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar a base editorial.");
  state = await response.json();
  $("section-id").replaceChildren(new Option("Escolha a editoria", ""), ...Object.entries(state.sections).map(([id,label]) => new Option(label,id)));
  renderList();
}

async function send(route, entry) {
  const response = await fetch(route, {
    method: "POST",
    headers: { "content-type": "application/json", "x-pauteiro-csrf": state.csrf },
    body: JSON.stringify(entry)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
  return result;
}

async function save(route) {
  if (!selectedId || working) return;
  const placementOnly = route === "/api/placement";
  if (placementOnly && (!$("section-id").reportValidity() || !$("related-to").reportValidity())) return;
  if (route === "/api/publish") {
    if (!$("editor").reportValidity()) return;
    if (!$("verified").checked) return status("Confirme a conferência do documento oficial antes de aplicar.", true);
    if (paragraphs().length < 2) return status("Escreva pelo menos dois parágrafos.", true);
  }
  working = true;
  for (const button of [$("save-draft"), $("apply-story"), $("apply-placement")]) button.disabled = true;
  status(route === "/api/draft" ? "Salvando rascunho…" : "Gerando e validando o site local. Isso pode levar alguns minutos…");
  try {
    const input = currentEntry();
    const {id, sectionId, placement, relatedTo} = input;
    const distribution = {id, sectionId, placement, relatedTo};
    const result = await send(route, placementOnly ? distribution : input);
    if (placementOnly) {
      state.placements = [...state.placements.filter(p => p.id !== id), distribution];
      const draft = state.drafts.find(d => d.id === input.id);
      if (draft) Object.assign(draft, distribution);
      status("Distribuição aplicada e validada no site local.");
      return;
    }
    await refresh();
    selectStory(selectedId);
    status(result.message);
  } catch (error) { status(error.message, true); }
  finally {
    working = false;
    for (const button of [$("save-draft"), $("apply-story"), $("apply-placement")]) button.disabled = false;
  }
}

$("new-button").addEventListener("click", newStory);
function showReviewQueue() {
  if (location.hash === "#revisao") $("revisao").open = true;
}
document.querySelector('.masthead-links a[href="#revisao"]').addEventListener("click", () => { $("revisao").open = true; });
window.addEventListener("hashchange", showReviewQueue);
showReviewQueue();
$("search").addEventListener("input", renderList);
$("catalog-filter").addEventListener("change", renderList);
$("save-draft").addEventListener("click", () => save("/api/draft"));
$("apply-placement").addEventListener("click", () => save("/api/placement"));
$("placement").addEventListener("change", () => {
  $("related-search").value = "";
  updateRelated($("related-to").value);
});
$("also-related").addEventListener("change", () => updateRelated($("related-to").value));
$("related-search").addEventListener("input", event => updateRelated($("related-to").value, event.target.value));
$("editor").addEventListener("submit", (event) => { event.preventDefault(); save("/api/publish"); });
$("editor").addEventListener("input", renderPreview);
refresh().then(() => status("Redação local pronta.")).catch((error) => status(error.message, true));
function pollReview() {
  refreshReview().finally(() => setTimeout(pollReview, 30_000));
}
pollReview();
