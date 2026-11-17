import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';

async function hash(file) {
  const digest = createHash('sha256');
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}

const app = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(app, '../..');
const runs = path.join(root, 'work/pipeline-completo/runs');
const result = JSON.parse(await fs.readFile(path.join(root, 'work/pipeline-completo/ultimo-resultado.json'), 'utf8'));
if (!['SUCCEEDED', 'DEGRADED_SOURCES'].includes(result.status) || !result.finished_at) throw Error('A última execução ainda não está validada.');
const work = path.resolve(result.work);
if (!work.startsWith(runs + path.sep)) throw Error('Execução fora da raiz autorizada.');
const source = path.join(work, 'site/src/generated');
const dest = path.join(app, 'src/generated');
const names = ['site-records.json', 'site-data.json'];
if ((await Promise.all(names.map(async name => await hash(path.join(source, name)) === await hash(path.join(dest, name))))).every(Boolean)) {
  console.log('Índice da redação já está atualizado.');
  process.exit(0);
}
const fresh = JSON.parse(await fs.readFile(path.join(source, 'site-records.json'), 'utf8'));
const old = JSON.parse(await fs.readFile(path.join(dest, 'site-records.json'), 'utf8'));
const ids = new Set(fresh.map(x => x.id));
if (!fresh.length || ids.size !== fresh.length || old.some(x => !ids.has(x.id))) throw Error('Índice recusado: duplicação ou perda de registros anteriores.');
const backup = path.join(root, 'backups', 'redacao-' + Date.now());
await fs.mkdir(backup, { recursive: true });
for (const name of names) {
  const target = path.join(dest, name);
  await fs.copyFile(target, path.join(backup, name));
  await fs.copyFile(path.join(source, name), target + '.tmp');
  await fs.rename(target + '.tmp', target);
}
console.log(`Redação atualizada: ${fresh.length} registros. Backup: ${backup}`);
