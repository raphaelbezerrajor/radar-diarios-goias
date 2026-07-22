import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";

const defaultSource = process.platform === "win32"
  ? "D:\\Trindade-Aberta\\data\\public"
  : "";
const sourceDir = path.resolve(process.argv[2] || process.env.TRINDADE_DATA_DIR || defaultSource);
const targetDir = path.resolve("data", "trindade");
const files = [
  "agm-trindade-acts-search.json",
  "agm-trindade-analysis-index.json",
  "agm-trindade-coverage.json",
  "agm-trindade-editions.json",
  "camara-index.json",
  "camara-legislative-index.json",
  "data-status.json",
  "news-2026.json",
  "tcmgo-trindade-decisions.json",
  "unified-search-index.json"
];

if (!sourceDir) {
  throw new Error("Informe a pasta data/public do Trindade Aberta por argumento ou TRINDADE_DATA_DIR.");
}

await access(sourceDir, constants.R_OK);
await mkdir(targetDir, { recursive: true });

const report = [];
for (const file of files) {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  await access(source, constants.R_OK);
  await copyFile(source, target);
  const contents = await readFile(target);
  report.push({
    file,
    bytes: contents.byteLength,
    sha256: createHash("sha256").update(contents).digest("hex")
  });
}

console.log(JSON.stringify({ source: "Trindade-Aberta/data/public", files: report }, null, 2));
