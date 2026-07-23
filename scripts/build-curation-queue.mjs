import fs from "node:fs/promises";
import path from "node:path";
import {
  CURATION_POLICY,
  selectCurationCandidates,
  validateEditorialBrief
} from "../src/lib/editorial/curation.mjs";

const root = process.cwd();
const sourcePath = path.join(root, "data", "trindade", "july-document-news-2026.json");
const briefsPath = path.join(root, "data", "editorial", "curated-briefs.json");
const queuePath = path.join(root, "data", "editorial", "curation-queue.json");

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
const candidates = selectCurationCandidates(source.items || [], briefs, {
  minimumScore: integerArg("min-score", CURATION_POLICY.minimumScore),
  maximumPerDate: integerArg("per-date", CURATION_POLICY.maximumPerDate),
  maximumPerRun: integerArg("limit", CURATION_POLICY.maximumPerRun)
});
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
    maximumPerDate: integerArg("per-date", CURATION_POLICY.maximumPerDate),
    maximumPerRun: integerArg("limit", CURATION_POLICY.maximumPerRun),
    automationBatchSize: CURATION_POLICY.automationBatchSize,
    automaticPublication: false
  },
  summary: {
    candidates: candidates.length,
    pending: statusCounts.pending || 0,
    withBrief: statusCounts.brief_exists || 0,
    existingBriefs: briefs.length,
    invalidBriefs: invalidBriefs.length
  },
  invalidBriefs,
  candidates
};

await fs.mkdir(path.dirname(queuePath), { recursive: true });
await fs.writeFile(queuePath, `${JSON.stringify(queue, null, 2)}\n`, "utf8");
console.log(JSON.stringify(queue.summary, null, 2));
