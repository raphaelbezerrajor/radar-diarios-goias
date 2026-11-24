import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { candidateFromRecord, coverageFor, routePitch, reportingOrder, nextReportingBatch } from "../src/lib/editorial/reporting-intake.mjs";
import {
  CURATION_POLICY,
  selectCurationCandidates,
  validateEditorialBrief
} from "../src/lib/editorial/curation.mjs";

const root = process.cwd();
const sourcePath = path.join(root, "data", "trindade", "july-document-news-2026.json");
const privateDir = process.env.PAUTEIRO_PRIVATE_DIR;
if (!privateDir) throw new Error('Defina PAUTEIRO_PRIVATE_DIR para gerar a fila somente na área privada.');
const briefsPath = path.join(privateDir, "curated-briefs.json");
const queuePath = path.join(privateDir, "curation-queue.json");

function integerArg(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  const value = Number(found?.slice(prefix.length));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

const source = JSON.parse(await fs.readFile(sourcePath, "utf8"));
let briefsDocument = { schemaVersion: 1, promptVersion: CURATION_POLICY.promptVersion, briefs: [] };
try {
  briefsDocument = JSON.parse(await fs.readFile(briefsPath, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const briefs = Array.isArray(briefsDocument.briefs) ? briefsDocument.briefs : [];
const invalidBriefs = briefs
  .map((brief) => ({ id: brief.id, ...validateEditorialBrief(brief) }))
  .filter((brief) => !brief.valid);
const daily = selectCurationCandidates(source.items || [], briefs, {
  minimumScore: integerArg("min-score", CURATION_POLICY.minimumScore),
  maximumPerDate: integerArg("per-date", CURATION_POLICY.maximumPerDate),
  maximumPerRun: integerArg("limit", CURATION_POLICY.maximumPerRun)
});
const records = JSON.parse(await fs.readFile(path.join(root, "src/generated/site-records.json"), "utf8"));
const year = Number(source.period.to.slice(0,4));
const privateJson = async (file, fallback) => {
  try { return JSON.parse(await fs.readFile(path.join(privateDir,file), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
};
const holds = new Set((await privateJson("publication-holds.json", {})).items?.map(row => row.id));
const handled = new Set(briefs.map(row => row.id));
const handledActs = new Set(briefs.map(row => row.source?.actSha256).filter(Boolean));
const published = records.filter(row => row.recordType === "story");
for (const record of published) {
  handled.add(record.id);
  if (record.id.startsWith("pauteiro-")) handled.add(record.id.slice("pauteiro-".length));
  if (record.actHash) handledActs.add(record.actHash);
}
const reviewRoot = path.join(privateDir,"triagens");
async function loadReviews(dir) {
  let files;
  try { files = await fs.readdir(dir,{withFileTypes:true}); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const file of files) {
    const target = path.join(dir,file.name);
    if (file.isDirectory()) await loadReviews(target);
    else if (file.isFile() && file.name === "brief.json") {
      const review = JSON.parse(await fs.readFile(target,"utf8"));
      handled.add(review.id);
      if (review.source?.actSha256) handledActs.add(review.source.actSha256);
    }
  }
}
await loadReviews(reviewRoot);
const rawById = new Map(source.items.map(item => [item.id,item]));
const briefById = new Map(briefs.map(item => [item.id,item]));
const candidatesById = new Map(daily.map(item => [item.id,item]));
for (const record of records.filter(item => item.reportingCandidate)) {
  candidatesById.set(record.id, candidateFromRecord(record,rawById.get(record.id),briefById.get(record.id)));
}
const candidates = [...candidatesById.values()].map(entry => {
  const coveredBy = coverageFor(entry,published);
  const routed = routePitch(entry,{
    year, cutoff:source.period.to, handled: Boolean(coveredBy) || handled.has(entry.id) || handledActs.has(entry.source.actSha256), held: holds.has(entry.id)
  });
  return coveredBy ? {...routed, coveredBy} : routed;
}).sort(reportingOrder);
const nextBatch = nextReportingBatch(candidates,CURATION_POLICY.automationBatchSize);
const statusCounts = candidates.reduce((counts, candidate) => {
  counts[candidate.status] = (counts[candidate.status] || 0) + 1;
  return counts;
}, {});

const queue = {
  schemaVersion: CURATION_POLICY.schemaVersion,
  promptVersion: CURATION_POLICY.promptVersion,
  generatedAt: source.generated_at || null,
  sourcePeriod: source.period || null,
  policy: {
    minimumScore: integerArg("min-score", CURATION_POLICY.minimumScore),
    localMinimumScore: CURATION_POLICY.localMinimumScore,
    controlMinimumScore: CURATION_POLICY.controlMinimumScore,
    prioritySources: ['tcmgo', 'tcego'],
    reservedPerCourtPerDate: CURATION_POLICY.reservedPerCourtPerDate,
    maximumPerDate: integerArg("per-date", CURATION_POLICY.maximumPerDate),
    maximumPerRun: integerArg("limit", CURATION_POLICY.maximumPerRun),
    automationBatchSize: CURATION_POLICY.automationBatchSize,
    automaticPublication: false
  },
  summary: {
    candidates: candidates.length,
    withdrawnFromSite: candidates.filter(row => row.withdrawnFromSite).length,
    forReporting: candidates.filter(row => row.routing === "investigate").length,
    watching: candidates.filter(row => row.routing === "watch").length,
    alreadyHandled: candidates.filter(row => row.routing === "in_workflow").length,
    pending: statusCounts.pending || 0,
    withBrief: statusCounts.brief_exists || 0,
    existingBriefs: briefs.length,
    invalidBriefs: invalidBriefs.length
  },
  invalidBriefs,
  nextBatch,
  candidates
};

await fs.mkdir(path.dirname(queuePath), { recursive: true });
try {
  const previous = await fs.readFile(queuePath);
  const history = path.join(privateDir, "queue-history");
  await fs.mkdir(history, { recursive: true });
  const hash = createHash("sha256").update(previous).digest("hex");
  await fs.writeFile(path.join(history, `${hash}.json`), previous, { flag: "wx" }).catch(error => {
    if (error.code !== "EEXIST") throw error;
  });
} catch (error) { if (error.code !== "ENOENT") throw error; }
const temporary = `${queuePath}.${randomUUID()}.tmp`;
await fs.writeFile(temporary, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
await fs.rename(temporary, queuePath);
console.log(JSON.stringify(queue.summary, null, 2));
