import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const directory = path.join(root, "data", "trindade");
const name = "july-document-news-2026.json";
const manifest = JSON.parse(await readFile(path.join(directory, "snapshot-manifest.json"), "utf8"));
const expected = manifest.files.find((item) => item.file === name)?.sha256;
if (!expected) throw new Error(`${name}: hash ausente do manifesto de sincronização.`);

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const target = path.join(directory, name);
try {
  if (hash(await readFile(target)) === expected) process.exit(0);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const contents = gunzipSync(await readFile(`${target}.gz`));
if (hash(contents) !== expected) throw new Error(`${name}: pacote gzip diverge do manifesto.`);
await writeFile(target, contents);
console.log(`${name}: restaurado do pacote verificado.`);
