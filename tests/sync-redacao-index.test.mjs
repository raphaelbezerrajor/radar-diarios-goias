import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { createHash } from 'node:crypto';

const app = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = path.resolve(app, 'tmp');

async function fixture(t, status) {
  await fs.mkdir(temporaryRoot, { recursive: true });
  const root = await fs.mkdtemp(path.join(temporaryRoot, 'redacao-sync-'));
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(temporaryRoot + path.sep));
    await fs.rm(root, { recursive: true, force: true });
  });
  const script = path.join(root, 'apps/pauteiro/scripts/sync-redacao-index.mjs');
  const generated = path.join(root, 'apps/pauteiro/src/generated');
  const operation = path.join(root, 'work/pipeline-completo');
  await fs.mkdir(path.dirname(script), { recursive: true });
  await fs.mkdir(generated, { recursive: true });
  await fs.mkdir(operation, { recursive: true });
  await fs.copyFile(path.join(app, 'scripts/sync-redacao-index.mjs'), script);
  await fs.writeFile(path.join(operation, 'ultimo-resultado.json'), JSON.stringify({ status, work: path.join(operation, 'runs/unvalidated') }));
  await fs.writeFile(path.join(generated, 'site-records.json'), '[{"id":"preservado"}]');
  await fs.writeFile(path.join(generated, 'site-data.json'), '{"edition":"local"}');
  return { root, operation, generated, run: () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', windowsHide: true }) };
}

for (const status of ['RUNNING', 'FAILED']) {
  test(`a redação abre com o índice existente quando a coleta está ${status}`, async t => {
    const f = await fixture(t, status);
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /índice local mantido/);
    assert.equal(await fs.readFile(path.join(f.generated, 'site-records.json'), 'utf8'), '[{"id":"preservado"}]');
    assert.equal(await fs.readFile(path.join(f.generated, 'site-data.json'), 'utf8'), '{"edition":"local"}');
  });
}

test('não anuncia um índice disponível se faltam os arquivos locais', async t => {
  const f = await fixture(t, 'RUNNING');
  await fs.unlink(path.join(f.generated, 'site-data.json'));
  assert.notEqual(f.run().status, 0);
});

test('não aceita um checkpoint com estado desconhecido', async t => {
  const f = await fixture(t, 'UNKNOWN');
  assert.notEqual(f.run().status, 0);
});

test('atualização local validada não regride para coleta anterior; divergência de hash bloqueia', async t => {
  const f = await fixture(t, 'SUCCEEDED');
  await fs.writeFile(path.join(f.operation,'ultimo-resultado.json'), JSON.stringify({status:'SUCCEEDED',finished_at:'2026-11-17T20:00:00Z',work:path.join(f.operation,'runs/old')}));
  const hashes = {};
  for (const name of ['site-records.json','site-data.json']) hashes[name] = createHash('sha256').update(await fs.readFile(path.join(f.generated,name))).digest('hex');
  await fs.writeFile(path.join(f.root,'work/local-release.json'), JSON.stringify({validated:true,createdAt:'2026-11-17T21:00:00Z',hashes}));
  const result=f.run();assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/mais recente mantida/);
  await fs.writeFile(path.join(f.generated,'site-data.json'),'{}');
  assert.notEqual(f.run().status,0);
});
