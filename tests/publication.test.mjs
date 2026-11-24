import test from "node:test";
import assert from "node:assert/strict";
import { classifyPublication, copiesDocumentBody } from "../src/lib/editorial/publication.mjs";

const item = { id: "extrato", recordType: "story", sourceType: "official_document", sourceUrl: "https://example.org/ato.pdf",
  editorialStatus: "published", importance: 98, title: "Contrato de aquisição", deck: "Objeto do extrato",
  paragraphs: ["Descrição do objeto.", "Referência da publicação."], sourceHash: "hash", path: "/base/extrato/" };

test("um extrato de alta relevância preserva sua fonte e aguarda apuração", () => {
  const record = classifyPublication({ ...item, publicationMode: "automatic_document_news" });
  assert.equal(record.recordType, "record");
  assert.equal(record.reportingCandidate, true);
  for (const key of ["id", "sourceUrl", "sourceHash", "path", "paragraphs"]) assert.deepEqual(record[key], item[key]);
  assert.equal(classifyPublication(record), record);
});

test("a publicação exige texto próprio editado ou promoção expressa em curadoria", () => {
  const edited = { ...item, publicationMode: "edited_document_news" };
  const curated = { ...item, publicationMode: "curated_document_news", curation: { promotedToStory: true } };
  for (const article of [edited, curated]) assert.equal(classifyPublication(article), article);
  for (const pending of [
    { ...curated, curation: {} }, { ...edited, editorialStatus: "draft" },
    { ...edited, paragraphs: ["Texto.", "Texto."] }, { ...edited, sourceUrl: "" }, { ...curated, recordType: "record" }
  ]) assert.equal(classifyPublication(pending).recordType, "record");
});

test("a redação pode citar o ato, mas a cópia integral continua em apuração", () => {
  assert.equal(copiesDocumentBody(["   DESCRIÇÃO do objeto.", "Referência da publicação."], item), true);
  assert.equal(copiesDocumentBody(["Descrição do objeto.", "A decisão alcança as unidades municipais identificadas no contrato."], item), false);
});
