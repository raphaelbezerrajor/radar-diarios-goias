import test from "node:test";
import assert from "node:assert/strict";
import { buildResearchChatUrl, buildResearchPrompt } from "../src/lib/research-chat.mjs";

const record = {
  title: "Goiás transfere à EMS benefício fiscal da Newcom com saldo de R$ 784,6 milhões",
  documentReference: "DOE-GO nº 24.881, página 79, Resolução 4.592/2026-CE/PRODUZIR",
  sourceUrl: "https://diariooficial.abc.go.gov.br/portal/visualizacoes/pdf/7397/",
  sourceHash: "5965ffb2"
};

test("link abre chat local com pauta e fonte, sem enviar o PDF inteiro", () => {
  const pageUrl = "https://example.org/base/ems/";
  const url = new URL(buildResearchChatUrl(record, pageUrl));
  assert.equal(url.protocol, "codex:");
  assert.equal(url.hostname, "new");
  assert.equal(url.searchParams.get("path"), "D:\\Pauteiro");
  assert.equal(url.searchParams.get("prompt"), buildResearchPrompt(record, pageUrl));
  assert.match(url.searchParams.get("prompt"), /página 79/);
  assert.match(url.searchParams.get("prompt"), /saldo de incentivo com renúncia realizada/);
});

test("registro sem referência ou fonte não insere campos vazios no roteiro", () => {
  const prompt = buildResearchPrompt({ title: "Ato em análise" }, "https://example.org/base/ato/");
  assert.doesNotMatch(prompt, /undefined|null/);
  assert.match(prompt, /Ato em análise/);
});
