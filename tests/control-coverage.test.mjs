import test from 'node:test';
import assert from 'node:assert/strict';
import { buildControlCoverage, courtId, courtRecordText, isAlego } from '../src/lib/editorial/control-coverage.mjs';
import { evaluateCurationCandidate, selectCurationCandidates } from '../src/lib/editorial/curation.mjs';
const act = (id, source_id, extra={}) => ({id,source_id,date:'2026-11-17',importance:0,title:'Determinação de correção das contas',evidence_excerpt:'O tribunal determinou a apresentação dos documentos.',official_url:'https://dec.tce.go.gov.br/',...extra});
test('registro de tribunal não transforma referência a lei ou valor em manchete',()=>{
  const text=courtRecordText({source_id:'tcego',official_title:'ACÓRDÃO Nº 10/2026',title:'Goiás sanciona lei',edition_number:'208',page_start:3,evidence_excerpt:'Nos termos da Lei 1/2000.'});
  assert.equal(text.title,'TCE-GO: ACÓRDÃO Nº 10/2026');assert.ok(!JSON.stringify(text).includes('sanciona'));assert.match(text.deck,/página 3/);
});
test('tribunais entram na triagem com pontuação zero e revisão humana', () => {
  for (const id of ['tcmgo','tcego']) {
    const result = evaluateCurationCandidate(act('a',id));
    assert.equal(result.eligible,true); assert.equal(result.mandatoryHumanReview,true);
  }
  assert.equal(evaluateCurationCandidate(act('a','tcmgo',{title:'Férias',evidence_excerpt:'Conceder licença ao servidor.'})).eligible,false);
  assert.equal(evaluateCurationCandidate(act('a','alego',{importance:100})).eligible,false);
  assert.equal(courtId({title:'TCE-GO',source_id:'agm'}),null);
  assert.equal(isAlego({sourceFamily:'Assembleia Legislativa de Goiás'}),true);
});
test('fila diária reserva espaço para ambos os tribunais sem publicar automaticamente', () => {
  const rows = Array.from({length:20},(_,i)=>act('m'+i,'agm',{importance:95}));
  const result = selectCurationCandidates([...rows,act('tcm','tcmgo'),act('tce','tcego'),act('ontem','tcmgo',{date:'2026-11-16'})]);
  assert.equal(result.filter(x=>x.date==='2026-11-17').length,12);
  assert.ok(result.some(x=>x.id==='tcm')); assert.ok(result.some(x=>x.id==='tce'));
  assert.equal(result.at(-1).id,'ontem');
  assert.ok(result.every(x=>x.requestedOutput.publishAutomatically===false));
});
test('cobertura destaca última edição válida e não expõe caminhos nem erros privados', () => {
  const source = {id:'tcmgo',official_url:'https://www.tcmgo.tc.br/doc/index.jsf',source_warning:'PRIVATE',editions:[
    {id:'a',date:'2026-11-16',edition_number:'2803',file_url:'https://www.tcmgo.tc.br/doc/index.jsf',download_status:'download_success',validation_status:'valid_pdf',local_path:'PRIVATE'},
    {id:'b',date:'2026-11-17',download_status:'download_failed'}]};
  const result = buildControlCoverage([{sources:[source]}]);
  assert.equal(result[0].latest.date,'2026-11-16'); assert.equal(result[1].latest,null);
  assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
