import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readSnapshot(name) {
  return JSON.parse(await readFile(new URL(`../data/trindade/${name}`, import.meta.url), "utf8"));
}

test("preserva a primeira carga documental da ALEGO", async () => {
  const [monitor, diaries, votes, contracts] = await Promise.all([
    readSnapshot("alego-monitor-2026.json"),
    readSnapshot("alego-diaries-2026.json"),
    readSnapshot("alego-votacoes-2026.json"),
    readSnapshot("alego-contracts-2026.json"),
  ]);

  assert.ok(diaries.editions.length >= 31);
  assert.ok(diaries.editions.every((item) => item.validation_status === "valid_pdf"));
  assert.ok(votes.rows.length >= 4365);
  assert.ok(votes.roll_calls.length >= 196);
  assert.ok(contracts.records.length >= 81);
  assert.equal(monitor.summary.failed_diary_downloads, 0);
  assert.equal(monitor.analysis_queue.length, 30);
});

test("Goiânia usa o repositório oficial quando o índice técnico está atrasado", async () => {
  const municipal = await readSnapshot("municipal-diaries-2026.json");
  const goiania = municipal.sources.find((item) => item.id === "goiania");

  assert.ok(goiania.summary.editions_total >= 37);
  assert.ok(goiania.summary.last_date >= "2026-07-22");
  assert.equal(goiania.source_warning, null);
  assert.ok(goiania.editions.some((item) =>
    item.date === "2026-07-22"
    && item.file_url.includes("www.goiania.go.gov.br/Download/legislacao/diariooficial/2026/")
  ));
});
