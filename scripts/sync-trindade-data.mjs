import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";

const configuredSource = process.argv[2] || process.env.TRINDADE_DATA_DIR;
if (!configuredSource) {
  throw new Error("Informe a pasta data/public do Trindade Aberta por argumento ou TRINDADE_DATA_DIR.");
}

const sourceDir = path.resolve(configuredSource);
const targetDir = path.resolve("data", "trindade");
const files = [
  "alego-contracts-2026.json",
  "alego-diaries-2026.json",
  "alego-monitor-2026.json",
  "alego-sanctions.json",
  "alego-votacoes-2026.json",
  "agm-index.json",
  "agm-trindade-acts-search.json",
  "agm-trindade-analysis-index.json",
  "agm-trindade-canonical-entities.json",
  "agm-trindade-coverage.json",
  "agm-trindade-editions.json",
  "agm-trindade-procurement.json",
  "budget-execution-index.json",
  "camara-accounting-index.json",
  "camara-annual-results.json",
  "camara-index.json",
  "camara-legislative-index.json",
  "company-profiles.json",
  "control-news-2026.json",
  "data-status.json",
  "july-document-news-2026.json",
  "municipal-diaries-2026.json",
  "news-2026.json",
  "tcmgo-trindade-checked-summary.json",
  "tcmgo-trindade-coverage.json",
  "tcmgo-trindade-decisions.json",
  "tcmgo-trindade-process-dossiers.json",
  "unified-search-index.json"
];

const baselines = {
  "alego-contracts-2026.json": ["records", 50],
  "alego-diaries-2026.json": ["editions", 31],
  "alego-votacoes-2026.json": ["rows", 4000],
  "agm-index.json": ["editions", 2066],
  "agm-trindade-acts-search.json": ["acts", 2919],
  "agm-trindade-procurement.json": ["records", 822],
  "camara-index.json": ["contracts", 88],
  "camara-legislative-index.json": ["propositions", 455],
  "company-profiles.json": ["profiles", 551],
  "july-document-news-2026.json": ["items", 500],
  "news-2026.json": ["items", 12],
  "tcmgo-trindade-decisions.json": ["decisions", 1097],
  "unified-search-index.json": ["records", 4621]
};

await access(sourceDir, constants.R_OK);
const report = [];
for (const file of files) {
  const source = path.join(sourceDir, file);
  await access(source, constants.R_OK);
  const contents = await readFile(source);
  const [collection, minimum] = baselines[file] || [];
  if (collection) {
    const parsed = JSON.parse(contents.toString("utf8"));
    const count = Array.isArray(parsed?.[collection]) ? parsed[collection].length : 0;
    if (count < minimum) {
      throw new Error(`${file}: baseline recusado (${count} < ${minimum} em ${collection}).`);
    }
  }
  report.push({
    file,
    bytes: contents.byteLength,
    sha256: createHash("sha256").update(contents).digest("hex")
  });
}

await mkdir(targetDir, { recursive: true });
for (const file of files) {
  await copyFile(path.join(sourceDir, file), path.join(targetDir, file));
}

const manifest = {
  schemaVersion: 1,
  source: "Trindade-Aberta/data/public",
  syncedAt: new Date().toISOString(),
  files: report
};
await writeFile(path.join(targetDir, "snapshot-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));
