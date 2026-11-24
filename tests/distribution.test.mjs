import test from 'node:test';
import assert from 'node:assert/strict';
import { assignDistribution, inGeneralNews } from '../src/lib/editorial/distribution.mjs';
import { readChoice, checkChoice, withChoice } from '../scripts/distribution-choice.mjs';
import { projectEditorial } from '../scripts/public-editorial-policy.mjs';

const records = () => ['principal','segunda','editoria','interna','historia','legado'].map((id, i) => ({
  id, title:id, path:'/base/'+id+'/', recordType:'story', sourceType:'official_document',
  year:i === 4 ? 2025 : 2026, date:i === 4 ? '2025-09-24' : ['2026-09-22','2026-09-23'][i%2], importance:100-i
}));
const choice = (id, placement, relatedTo) => readChoice({id,sectionId:'obras',placement,relatedTo});
const initial = [choice('principal','capa'), choice('segunda','capa'), choice('editoria','editoria'),
  choice('interna','relacionada','principal'), choice('historia','capa')];

test('editoria e destino são independentes; o acervo conserva as matérias internas e o histórico', () => {
  const all = records();
  const {cover, desks} = assignDistribution(all, initial, 2026);
  assert.deepEqual(cover.map(r=>r.id), ['segunda','principal']);
  assert.deepEqual(desks.obras.map(r=>r.id), ['segunda','principal','editoria','historia']);
  assert.deepEqual(all[0].relatedReads.map(r=>r.path), ['/base/interna/']);
  assert.deepEqual(all.filter(inGeneralNews).map(r=>r.id), ['principal','segunda','historia','legado']);
  assert.ok(!all[5].placement);
});

test('a redação muda distribuição sem tocar no texto; reatribuir ou promover remove o vínculo anterior', () => {
  const before = {schemaVersion:1, stories:[{id:'interna',status:'published',title:'Texto intacto'}], placements:initial};
  const after = withChoice(before, choice('interna','relacionada','segunda'), null);
  assert.deepEqual(before.stories, after.stories);
  const projected = projectEditorial({'story-overrides.json':after})['story-overrides.json'];
  const all = records();
  assignDistribution(all, projected.placements, 2026);
  assert.ok(!all[0].relatedReads);
  assert.equal(all[1].relatedReads[0].title, 'interna');
  const promoted = records();
  const {cover} = assignDistribution(promoted, withChoice(after, choice('interna','capa'), null).placements, 2026);
  assert.ok(cover.some(r=>r.id === 'interna'));
  assert.ok(!promoted[1].relatedReads);
  const empty = assignDistribution(records(), [], 2026);
  assert.deepEqual(empty.cover, []);
  assert.deepEqual(empty.desks.saude, []);
});

test('exige matéria publicada para o vínculo e impede ciclos, duplicatas, atos e anos inválidos', () => {
  const published = new Set(records().map(r=>r.id));
  const live = {date:'2026-09-22',year:2026};
  assert.ok(checkChoice(choice('principal','relacionada','interna'), published, initial, live));
  assert.ok(checkChoice(choice('principal','relacionada','outra'), published, initial, live));
  assert.ok(checkChoice(choice('principal','relacionada','principal'), published, initial, live));
  assert.ok(checkChoice(choice('historia','capa'), published, initial, {...live,date:'2025-09-22'}));
  assert.equal(checkChoice({id:'rascunho'}, published, initial, {...live,draft:true}), '');
  assert.throws(() => assignDistribution(records(), [...initial,initial[0]], 2026));
  assert.throws(() => assignDistribution([{...records()[0],recordType:'record'}], [initial[0]], 2026));
});
