import test from "node:test";
import assert from "node:assert/strict";
import { applyStoryEntry, toNewStorySource, validateStoryEntry } from "../src/lib/editorial/story-overrides.mjs";

const source = {
  id: "story-1",
  recordType: "story",
  title: "Título anterior",
  deck: "Olho anterior",
  paragraphs: ["Parágrafo anterior um.", "Parágrafo anterior dois."],
  sourceUrl: "https://orgao.go.gov.br/diario/123.pdf",
  sourceHash: "abc"
};

test("rascunho não altera matéria publicada", () => {
  const draft = { kind: "edit", status: "draft", id: source.id, title: "Novo título" };
  assert.equal(applyStoryEntry(source, draft), source);
});

test("edição publicada mantém fonte e substitui apenas texto editorial", () => {
  const edit = {
    kind: "edit", status: "published", id: source.id,
    sourceUrl: source.sourceUrl, sourceHash: source.sourceHash,
    title: "Novo título jornalístico sobre o ato",
    deck: "Olho explicativo sobre o alcance do documento oficial",
    paragraphs: [
      "Primeiro parágrafo com os fatos do ato e sua data de publicação.",
      "Segundo parágrafo com o contexto e os limites do documento."
    ]
  };
  const updated = applyStoryEntry(source, edit);
  assert.equal(updated.title, edit.title);
  assert.equal(updated.sourceUrl, source.sourceUrl);
  assert.equal(updated.publicationMode, "edited_document_news");
});

test("hash ou URL alterados bloqueiam a edição", () => {
  const edit = {
    kind: "edit", status: "published", id: source.id,
    title: "Novo título jornalístico sobre o ato",
    deck: "Olho explicativo sobre o alcance do documento oficial",
    paragraphs: ["Primeiro parágrafo suficientemente completo para a matéria.", "Segundo parágrafo suficientemente completo para a matéria."],
    sourceHash: "outro-hash"
  };
  assert.equal(validateStoryEntry(edit, source).valid, false);
  assert.equal(applyStoryEntry(source, edit), source);
});

test("matéria nova exige URL HTTPS e referência documental", () => {
  const entry = {
    kind: "new", status: "published", id: "pauteiro-1", date: "2026-09-22", city: "Goiás",
    title: "Governo de Goiás publica novo ato com impacto na saúde",
    deck: "A medida consta em edição oficial e precisa ser acompanhada nas próximas etapas.",
    paragraphs: ["O governo publicou a medida na edição oficial desta terça-feira.", "O texto estabelece os limites do ato e seus próximos passos."],
    sourceLabel: "Diário Oficial do Estado de Goiás", sourceUrl: "http://exemplo.com/pdf", documentReference: "DOE 24.869 · página 2"
  };
  assert.equal(validateStoryEntry(entry).valid, false);
  assert.equal(toNewStorySource(entry), null);
  entry.sourceUrl = "https://diariooficial.abc.go.gov.br/edicao.pdf";
  assert.equal(validateStoryEntry(entry).valid, true);
  assert.equal(toNewStorySource(entry).publication_mode, "edited_document_news");
});
