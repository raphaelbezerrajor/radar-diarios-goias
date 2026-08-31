import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "data/trindade/source-previews.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const byId = new Map(manifest.items.map((x) => [x.record_id, x]));
const records = [
  ["tcego-156-temporarios-educacao-segundo-trimestre", 5, "2f828063b3a5a1757c-p-5.webp", "2f828063b3a5a1757c76ae5715a2c0b3eb39943e79fd15513302e42350196743", "https://dec.tce.go.gov.br/ConsultaDiario/CarregaDocumento?documento=331291642252761"],
  ["anapolis-4014-maquinas-infraestrutura-32-milhoes", 3, "50a29fb3620348f76d-p-3.webp", "50a29fb3620348f76df19298e872284ace357ff6615a4635be541e4aa5be15ae", "https://dom.anapolis.go.gov.br/diarios/lista/23695"],
  ["anapolis-4014-locacao-veiculos-47-milhoes", 4, "50a29fb3620348f76d-p-4.webp", "50a29fb3620348f76df19298e872284ace357ff6615a4635be541e4aa5be15ae", "https://dom.anapolis.go.gov.br/diarios/lista/23695"],
  ["agm-3693-inhumas-gases-medicinais-12-milhoes", 36, "bf863d1ba635125450-p-36.webp", "bf863d1ba635125450368ffdc8ea72e69519ba2512ba07a2850ceeed6b927fbb", "https://www.diariomunicipal.com.br/agm/"],
];
for (const [recordId, page, name, sourceSha, sourceUrl] of records) {
  const contents = await readFile(resolve(root, "public/assets/sources/control", name));
  byId.set(recordId, { record_id: recordId, source_url: sourceUrl, source_sha256: sourceSha, generated_at: new Date().toISOString(), src: `/assets/sources/control/${name}`, page, width: 1100, height: 1555, bytes: contents.length, preview_sha256: createHash("sha256").update(contents).digest("hex") });
}
manifest.generated_at = new Date().toISOString(); manifest.items = [...byId.values()].sort((a,b) => a.record_id.localeCompare(b.record_id));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8"); console.log(JSON.stringify({ previews: records.length }));
