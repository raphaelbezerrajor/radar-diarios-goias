import test from 'node:test';
import assert from 'node:assert/strict';
import { projectEditorial, assertPublicEditorial } from '../scripts/public-editorial-policy.mjs';
import { applyCuration } from '../src/lib/editorial/curation.mjs';

const fixture=()=>({
 'curated-briefs.json':{briefs:[{id:'approved',status:'approved',source:{documentSha256:'a'.repeat(64)},humanReview:{notes:'PRIVATE'},editorial:{reportingQuestions:['PRIVATE'],publication:{title:'Título público',deck:'Olho público',paragraphs:['Primeiro parágrafo.','Segundo parágrafo.']}}},{id:'draft',status:'draft'}]},
 'story-overrides.json':{stories:[{id:'published',status:'published',sourceLocalPath:'PRIVATE',title:'Notícia'},{id:'review',status:'needs_review',title:'PRIVATE'}]},
 'publication-holds.json':{items:[{id:'hold',documentSha256:'b'.repeat(64),reason:'PRIVATE',archiveCorrection:{title:'Correção pública',notes:'PRIVATE'}}]},
 'curation-queue.json':{candidates:[{notes:'PRIVATE'}]}
});
test('exportação exclui rascunhos, hipóteses, notas e caminhos sem mudar o original',()=>{
 const source=fixture(), before=JSON.stringify(source), result=projectEditorial(source);
 assert.equal(JSON.stringify(source),before);
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 assert.equal(result['curated-briefs.json'].briefs.length,1);
 assert.equal(result['story-overrides.json'].stories.length,1);
 assert.equal(result['publication-holds.json'].items[0].archiveCorrection.title,'Correção pública');
 assert.deepEqual(assertPublicEditorial(result),result);
});
test('barreira recusa campos privados mesmo em item aprovado',()=>{
 const result=projectEditorial(fixture());result['curated-briefs.json'].briefs[0].notes='PRIVATE';
 assert.throws(()=>assertPublicEditorial(result));
});
test('curadoria pública se aplica apenas com aprovação e hash correspondente',()=>{
 const brief=projectEditorial(fixture())['curated-briefs.json'].briefs[0];
 const record={title:'Original',sourceHash:'a'.repeat(64)};
 assert.equal(applyCuration(record,brief).title,'Título público');
 assert.equal(applyCuration(record,{...brief,status:'draft'}).title,'Original');
 assert.equal(applyCuration({...record,sourceHash:'b'.repeat(64)},brief).title,'Original');
});
test('aprovação sem texto público completo bloqueia exportação',()=>{
 const source=fixture();delete source['curated-briefs.json'].briefs[0].editorial.publication;
 assert.throws(()=>projectEditorial(source));
});
