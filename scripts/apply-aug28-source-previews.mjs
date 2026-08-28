import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "data/trindade/source-previews.json");
const assetRoot = resolve(root, "public/assets/sources/control");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const sourceSha = "6c41c644a86e87d6f90935b252ec0fc131ba7e95e372ea40461fb0411bd8baa6";
const sourceUrl = "https://diariooficial.abc.go.gov.br/portal/visualizacoes/pdf/7340/";
const records = [
  ["doego-24853-maes-goias-convenio-102-milhoes", 19],
  ["doego-24853-go341-pavimentacao-142-milhoes", 24],
  ["doego-24853-anapolis-veiculos-47-milhoes", 31],
];
const byId = new Map(manifest.items.map((item) => [item.record_id, item]));
for (const [recordId, page] of records) {
  const name = `${sourceSha.slice(0, 18)}-p-${page}.webp`;
  const contents = await readFile(resolve(assetRoot, name));
  byId.set(recordId, {
    record_id: recordId, source_url: sourceUrl, source_sha256: sourceSha,
    generated_at: new Date().toISOString(), src: `/assets/sources/control/${name}`,
    page, width: 1100, height: 1555, bytes: contents.length,
    preview_sha256: createHash("sha256").update(contents).digest("hex"),
  });
}
manifest.generated_at = new Date().toISOString();
manifest.items = [...byId.values()].sort((a, b) => a.record_id.localeCompare(b.record_id));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ previews: records.length }));
