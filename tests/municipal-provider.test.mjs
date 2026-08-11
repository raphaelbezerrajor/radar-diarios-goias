import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { MUNICIPAL_PROVIDER_METHODS } from "../src/lib/municipal/MunicipalDataProvider.mjs";
import { createTrindadeJsonProvider, isPublicDocumentUrl } from "../src/lib/municipal/trindade-json-provider.mjs";

const provider = createTrindadeJsonProvider({ dataDir: path.resolve("data", "trindade") });

test("implementa o contrato MunicipalDataProvider", () => {
  for (const method of MUNICIPAL_PROVIDER_METHODS) assert.equal(typeof provider[method], "function", method);
});

test("preserva os baselines municipais publicados", async () => {
  const [edicoes, atos, noticias, proposicoes, processos, estado, entidades, registros] = await Promise.all([
    provider.listarEdicoes(),
    provider.buscarAtos(),
    provider.listarNoticias(),
    provider.listarProposicoes(),
    provider.listarProcessosTCM(),
    provider.obterEstadoDaBase(),
    provider.buscarEntidades(""),
    provider.buscarRegistros()
  ]);
  assert.equal(edicoes.length, 2066);
  assert.equal(atos.length, 2919);
  assert.equal(noticias.length, 12);
  assert.equal(proposicoes.length, 455);
  assert.ok(processos.length >= 1073);
  assert.equal(new Set(processos.map((item) => item.id)).size, processos.length);
  assert.equal(entidades.length, 551);
  assert.equal(registros.length, 4621);
  assert.equal(estado.source_counts.acts, 2919);
  assert.equal(estado.source_counts.tcm_confirmed, 445);
});

test("filtra atos e recupera registros por id", async () => {
  const contratos = await provider.buscarAtos({ consulta: "contrato", ano: 2026, limit: 10 });
  assert.ok(contratos.length > 0);
  assert.ok(contratos.every((item) => item.edition_date.startsWith("2026-")));
  assert.deepEqual(await provider.obterAto(contratos[0].id), contratos[0]);
});

test("não aceita caminhos locais como documento público", () => {
  assert.equal(isPublicDocumentUrl("https://example.org/documento.pdf"), true);
  assert.equal(isPublicDocumentUrl("D:\\dados\\documento.pdf"), false);
  assert.equal(isPublicDocumentUrl("file:///dados/documento.pdf"), false);
});

