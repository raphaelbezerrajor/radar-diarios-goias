import test from "node:test";
import assert from "node:assert/strict";
import { coverageFor, routePitch, reportingOrder, nextReportingBatch } from "../src/lib/editorial/reporting-intake.mjs";
import { classifyPublication } from "../src/lib/editorial/publication.mjs";

const entry = {id:"obra", status:"pending",date:"2026-07-01",importance:85,
  source:{id:"agm",url:"https://example.org/diario.pdf",documentSha256:"pdf",pageStart:2,actSha256:"ato"},
  factPacket:{officialTitle:"Extrato de contrato",extractedDeck:"Construção de creche",values:[]}};
const classify = (item, flags={}) => routePitch(item,{year:2026,...flags});

test("impacto e fonte identificada têm precedência sobre recência e nota de extração", () => {
  const extracted = classify({...entry,id:"generico",date:"2026-11-24",importance:100,factPacket:{officialTitle:"Extrato de aquisição"}});
  const school = classify(entry);
  assert.equal(extracted.routing,"watch");
  assert.equal(school.routing,"investigate");
  assert.equal([extracted,school].sort(reportingOrder)[0],school);
  assert.equal(classify(entry,{held:true}).routing,"watch");
  assert.equal(classify(entry,{handled:true}).routing,"in_workflow");
  assert.equal(classify({...entry,source:{...entry.source,id:"alego"}}).routing,"watch");
  assert.equal(classify({...entry,source:{...entry.source,pageStart:null}}).routing,"watch");
  assert.deepEqual(nextReportingBatch([school,{...school,id:"duplicado"},extracted],12),["obra"]);
});
test("a queda de pontuação de um extrato retirado mantém a pauta fora do site", () => {
  const row = {id:"extrato",recordType:"record",importance:1};
  assert.ok(classifyPublication(row,true).reportingCandidate);
  assert.equal(classifyPublication(row,false),row);
});

test("outro ID pode cobrir o mesmo ato, mas a mesma página pode reunir contratos distintos", () => {
  const pitch = {...entry,factPacket:{officialTitle:"Extrato do Contrato nº 091/2026"}};
  const story = {id:"reportagem",sourceHash:"pdf",documentReference:"Diário municipal, p. 2; Contrato 91/2026"};
  assert.equal(coverageFor(pitch,[story]),story.id);
  assert.equal(coverageFor(pitch,[{...story,documentReference:"p. 2; contrato 92/2026"}]),null);
  assert.equal(coverageFor(pitch,[{...story,documentReference:"p. 3; contrato 91/2026"}]),null);
});
