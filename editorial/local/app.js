const $ = (id) => document.getElementById(id);
const fields = {
  city: $("city"), date: $("date"), scope: $("scope"), type: $("type"), importance: $("importance"),
  title: $("title"), deck: $("deck"), body: $("body"), sourceLabel: $("source-label"),
  documentReference: $("reference"), sourceUrl: $("source-url")
};
let state = { stories: [], overrides: [], drafts: [], csrf: "", siteBase: "/radar-diarios-goias/" };
let selectedId = null;
let selectedKind = "edit";
let selectedSourceHash = "";
let selectedPath = "";
let working = false;

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

function setFields(item) {
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
  const override = state.overrides.find((item) => item.id === id);
  const draft = state.drafts.find((item) => item.id === id);
  if (!story && !override && !draft) return;
  selectedId = id;
  selectedKind = draft?.kind || override?.kind || (story?.editorialEntryId ? "new" : "edit");
  selectedPath = story?.path || "";
  setFields({ ...story, ...override, ...draft });
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
  const matching = merged.filter((item) => !query || [item.title, item.city, item.id].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query));
  $("count").textContent = `${matching.length} de ${merged.length} matérias e rascunhos`;
  const list = $("list");
  list.replaceChildren();
  for (const item of matching.slice(0, 100)) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.id = item.id;
    button.setAttribute("aria-current", item.id === selectedId ? "true" : "false");
    button.textContent = item.title || "Rascunho sem título";
    const meta = document.createElement("small");
    meta.textContent = `${item.city || "Sem cidade"} · ${item.date || "Sem data"}${item.draft ? " · Rascunho" : ""}`;
    button.appendChild(meta);
    button.addEventListener("click", () => selectStory(item.id));
    list.appendChild(button);
  }
}

async function refresh() {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error("Não foi possível carregar a base editorial.");
  state = await response.json();
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
  if (route === "/api/publish") {
    if (!$("editor").reportValidity()) return;
    if (!$("verified").checked) return status("Confirme a conferência do documento oficial antes de aplicar.", true);
    if (paragraphs().length < 2) return status("Escreva pelo menos dois parágrafos.", true);
  }
  working = true;
  for (const button of [$("save-draft"), $("apply-story")]) button.disabled = true;
  status(route === "/api/publish" ? "Gerando e validando o site local. Isso pode levar alguns minutos…" : "Salvando rascunho…");
  try {
    const result = await send(route, currentEntry());
    await refresh();
    selectStory(selectedId);
    status(result.message);
  } catch (error) { status(error.message, true); }
  finally {
    working = false;
    for (const button of [$("save-draft"), $("apply-story")]) button.disabled = false;
  }
}

$("new-button").addEventListener("click", newStory);
$("search").addEventListener("input", renderList);
$("save-draft").addEventListener("click", () => save("/api/draft"));
$("editor").addEventListener("submit", (event) => { event.preventDefault(); save("/api/publish"); });
$("editor").addEventListener("input", renderPreview);
refresh().then(() => status("Redação local pronta.")).catch((error) => status(error.message, true));
