import { createServer } from "node:http";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateStoryEntry } from "../src/lib/editorial/story-overrides.mjs";
import { copiesDocumentBody } from "../src/lib/editorial/publication.mjs";
import { nextReportingBatch, reportingOrder } from "../src/lib/editorial/reporting-intake.mjs";
import { validateEditorialBrief } from "../src/lib/editorial/curation.mjs";
import { sections } from "../src/lib/editorial/distribution.mjs";
import { isAlego } from "../src/lib/editorial/control-coverage.mjs";
import { readChoice, checkChoice, withChoice } from "./distribution-choice.mjs";

const project = fileURLToPath(new URL("../", import.meta.url));
const workspace = path.resolve(project, "../..");
const editorDir = path.join(project, "editorial", "local");
const distDir = path.join(project, "dist");
const privateEditorialDir = process.env.PAUTEIRO_PRIVATE_DIR || path.join(workspace, "private", "editorial");
const overridesPath = path.join(privateEditorialDir, "story-overrides.json");
const reviewDir = path.join(privateEditorialDir, "triagens");
const draftsPath = process.env.PAUTEIRO_REDACTION_DRAFTS || path.join(workspace, "work", "pauteiro-editorial-drafts.json");
const recordsPath = path.join(project, "src", "generated", "site-records.json");
const siteBase = "/radar-diarios-goias/";
const port = Number(process.env.PAUTEIRO_REDACTION_PORT || 4317);
const origin = `http://127.0.0.1:${port}`;
const csrf = randomBytes(32).toString("hex");
let building = false;
let writing = false;

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf" };
const securityHeaders = {
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cache-control": "no-store"
};

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function atomicJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try { await fs.rename(temporary, file); }
  finally { await fs.rm(temporary, { force: true }); }
}

function sendJson(response, status, body) {
  response.writeHead(status, { ...securityHeaders, "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 200_000) throw new Error("Texto maior que o limite de 200 KB.");
  }
  return JSON.parse(body);
}

function normalizeEntry(value, status) {
  return {
    kind: value.kind,
    status,
    id: String(value.id || "").trim(),
    city: String(value.city || "").trim(),
    date: String(value.date || "").trim(),
    scope: String(value.scope || "").trim(),
    type: String(value.type || "").trim(),
    importance: Number(value.importance) || 80,
    title: String(value.title || "").trim(),
    deck: String(value.deck || "").trim(),
    paragraphs: Array.isArray(value.paragraphs) ? value.paragraphs.map((item) => String(item).trim()).filter(Boolean) : [],
    sourceLabel: String(value.sourceLabel || "").trim(),
    sourceUrl: String(value.sourceUrl || "").trim(),
    sourceHash: String(value.sourceHash || "").trim(),
    documentReference: String(value.documentReference || "").trim(),
    updatedAt: new Date().toISOString().slice(0, 10)
  };
}

async function catalog() {
  const records = await readJson(recordsPath, []);
  return records.filter((item) => ["story", "record"].includes(item.recordType)).map((item) => ({
    id: item.id, path: item.path, city: item.city, date: item.date, scope: item.scope,
    type: item.type, importance: item.importance, title: item.title, deck: item.deck,
    paragraphs: item.paragraphs || [], sourceLabel: item.sourceLabel, sourceUrl: item.sourceUrl,
    sourceHash: item.sourceHash || "", documentReference: item.documentReference || item.sourceNote || "",
    recordType: item.recordType, publicationMode: item.publicationMode,
    reportingCandidate: item.reportingCandidate === true,
    distributionEligible: item.recordType === "story", historicalAlego: isAlego(item),
    sectionId: item.sectionId, placement: item.placement, relatedTo: item.relatedTo,
    editorialEntryId: item.editorialEntryId || null
  }));
}

function triageCollectedAct(entry, hold) {
  const source = entry.source || {};
  const facts = entry.factPacket || {};
  const type = entry.actType;
  const title = facts.extractedTitle || facts.officialTitle || entry.typeLabel || "Ato coletado";
  const subject = [facts.officialTitle, facts.extractedTitle, facts.extractedDeck]
    .join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const routine = /\b(ferias|diarias|licenca premio|licenca medica|folha de ponto)\b/.test(subject);
  const evidence = Boolean(source.documentSha256 && source.pageStart && source.url);
  const control = ["tcmgo", "tcego"].includes(source.id);
  const decision = /cautelar|ressarcimento|multa|rejeicao|improceden|irregular|\bsuspensao\b|determina/.test(subject + " " +
    String(facts.evidenceExcerpt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
  const procurement = ["contrato", "aditivo", "dispensa", "homologacao", "pregao", "inexigibilidade", "adjudicacao"].includes(type);
  const impact = (entry.curationReasons || []).some((reason) => reason.startsWith("possível impacto"));
  const priority = Number(entry.priority) || 0;
  const toInvestigate = !hold && (entry.routing ? entry.routing === "investigate" : !routine && evidence && (control ? decision : priority >= 85 && (procurement || impact)));
  const status = toInvestigate ? "investigate" : "watch";
  const reason = hold?.reason || (entry.routing === "investigate" ? "Conferir o efeito concreto indicado no ato e se há um fato novo para o leitor." : null) || (toInvestigate
    ? control ? "O texto extraído indica uma decisão de controle com possível efeito concreto."
      : "O ato combina prioridade alta na curadoria com contratação pública ou possível impacto em serviços, políticas ou patrimônio."
    : routine ? "O título indica rotina administrativa. A triagem preservou o registro para consulta."
      : !evidence ? "A referência ainda precisa de PDF com hash e página identificada."
        : "A triagem automática ainda não identificou um efeito concreto suficiente para encaminhar este ato à apuração.");
  const pendingChecks = routine && !hold ? ["Reavaliar se aparecer um efeito público além da rotina administrativa."]
    : [
      "Conferir o PDF e a página citada, cruzar o identificador com o histórico e apontar o fato novo.",
      ...(procurement ? ["Confirmar objeto, processo, valor, fornecedor e estágio da contratação."] : []),
      ...(control ? ["Ler o dispositivo e verificar o alcance da decisão, a vigência e eventual recurso."] : []),
      ...(entry.mandatoryHumanReview ? ["Submeter o texto à revisão humana e conferir a necessidade de contraditório."] : [])
    ];
  return {
    id: entry.id, status, date: entry.date, title, deck: [facts.extractedDeck, source.documentReference].filter(Boolean).join(" · "), paragraphs: [],
    reason, pendingChecks, selectedBecause: entry.impactReasons || entry.curationReasons || [], sourceUrl: source.url,
    priority, withdrawnFromSite: Boolean(entry.withdrawnFromSite)
  };
}

async function reviewQueue() {
  const revisions = new Map();
  let unreadable = 0;
  const [queue, curated, holds, overrides] = await Promise.all([
    readJson(path.join(privateEditorialDir, "curation-queue.json"), {}),
    readJson(path.join(privateEditorialDir, "curated-briefs.json"), {}),
    readJson(path.join(privateEditorialDir, "publication-holds.json"), {}),
    readJson(overridesPath, {})
  ]);
  const holdsById = new Map((holds.items || []).map((item) => [item.id, item]));

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    if (entries.some((entry) => entry.isFile() && entry.name === "brief.json")) {
      try {
        const brief = await readJson(path.join(directory, "brief.json"), {});
        if (!validateEditorialBrief(brief).valid) throw new Error("Brief inválido.");
        const revision = path.relative(reviewDir, directory).split(path.sep).join("/");
        const previous = revisions.get(brief.id);
        if (previous && revision.localeCompare(previous.revision) <= 0) return;
        const editorial = brief.editorial;
        const publication = editorial?.publication;
        const pending = ["draft", "needs_review"].includes(brief.status);
        const nextActions = Array.isArray(brief.workflow?.actions) ? brief.workflow.actions
          .filter(({ status }) => ["pending", "in_progress", "blocked"].includes(status))
          .map(({ action }) => action).filter(Boolean) : [];
        const questions = editorial?.reportingQuestions || [];
        revisions.set(brief.id, { revision, actHash: brief.source?.actSha256, item: pending ? {
          id: brief.id, revision, status: brief.status, stage: brief.workflow?.stage,
          date: String(brief.officialPublicationDate || brief.actDate || ""),
          title: publication?.title || editorial.headlineOptions[0], deck: publication?.deck,
          paragraphs: Array.isArray(publication?.paragraphs) ? publication.paragraphs : [],
          reason: brief.workflow?.editingReason || holdsById.get(brief.id)?.reason || brief.humanReview?.notes || "",
          pendingChecks: [...new Set([...nextActions, ...(Array.isArray(editorial.contextToFind) ? editorial.contextToFind : [])])],
          questions, sourceUrl: brief.source?.url
        } : null });
      } catch {
        unreadable++;
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(path.join(directory, entry.name));
    }
  }

  try {
    await walk(reviewDir);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const handledIds = new Set([
    ...revisions.keys(),
    ...(overrides.stories || []).filter(story => story.status === "published").flatMap(story => [story.id, story.id.replace(/^pauteiro-/, "")]),
    ...(curated.briefs || []).filter((brief) => ["approved", "rejected"].includes(brief.status)).map((brief) => brief.id)
  ]);
  const reviewedActs = new Set([...revisions.values()].map(({ actHash }) => actHash).filter(Boolean));
  const available = (queue.candidates || [])
    .filter(entry => entry.id && entry.routing !== "in_workflow" && !handledIds.has(entry.id) && !reviewedActs.has(entry.source?.actSha256))
    .sort(reportingOrder);
  const batch = new Set(nextReportingBatch(available.filter(entry => !holdsById.has(entry.id)),queue.policy?.automationBatchSize || 12));
  const incoming = available.map(entry => ({...triageCollectedAct(entry, holdsById.get(entry.id)), nextBatch:batch.has(entry.id)}));
  return {
    unreadable, incoming, generatedAt: queue.generatedAt || null,
    items: [...revisions.values()].map(({ item }) => item).filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date) || b.revision.localeCompare(a.revision))
  };
}

function runNode(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: project, windowsHide: true, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ...env } });
    let output = "";
    child.stdout.on("data", (chunk) => { output = (output + chunk).slice(-3500); });
    child.stderr.on("data", (chunk) => { output = (output + chunk).slice(-3500); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error(output || `Processo saiu com código ${code}.`)));
  });
}

async function buildAndValidate() {
  const tests = (await fs.readdir(path.join(project, "tests"))).filter((name) => name.endsWith(".test.mjs")).map((name) => `tests/${name}`);
  await runNode(["--test", ...tests]);
  await runNode(["scripts/export-public-editorial.mjs", privateEditorialDir]);
  await runNode(["scripts/validate-public-editorial.mjs"]);
  await runNode(["scripts/build-site-data.mjs"]);
  await runNode(["scripts/build-curation-queue.mjs"], { PAUTEIRO_PRIVATE_DIR: privateEditorialDir });
  await runNode(["scripts/validate-news-policy.mjs"]);
  const workDir = path.join(project, "work");
  await fs.mkdir(workDir, { recursive: true });
  const buildDir = await fs.mkdtemp(path.join(workDir, "redacao-build-"));
  const candidate = path.join(buildDir, "candidato");
  const previous = path.join(buildDir, "anterior");
  let movedPrevious = false;
  try {
    await runNode(["--max-old-space-size=8192", "node_modules/astro/astro.js", "build", "--outDir", candidate]);
    await runNode(["scripts/validate-site.mjs"], { PAUTEIRO_BUILD_DIR: candidate });
    try {
      await fs.rename(distDir, previous);
      movedPrevious = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const hashes = {};
    for (const name of ['site-data.json', 'site-records.json']) {
      const digest = createHash('sha256');
      for await (const chunk of createReadStream(path.join(project, 'src/generated', name))) digest.update(chunk);
      hashes[name] = digest.digest('hex');
    }
    await fs.rename(candidate, distDir);
    try {
      await atomicJson(path.join(workspace, 'work/local-release.json'), {validated: true, createdAt: new Date().toISOString(), hashes});
    } catch (error) {
      await fs.rename(distDir, candidate);
      throw error;
    }
    movedPrevious = false;
  } catch (error) {
    if (movedPrevious) {
      await fs.rename(previous, distDir);
      movedPrevious = false;
    }
    throw error;
  } finally {
    // Se a restauração falhar, conserva a versão anterior no diretório de trabalho.
    if (!movedPrevious) await fs.rm(buildDir, {recursive:true, force:true}).catch(error => console.error(error.message));
  }
}

async function serveFile(response, root, relative) {
  const safe = path.resolve(root, relative);
  if (safe !== root && !safe.startsWith(`${root}${path.sep}`)) return sendJson(response, 403, { error: "Caminho inválido." });
  try {
    const file = (await fs.stat(safe)).isDirectory() ? path.join(safe, "index.html") : safe;
    const bytes = await fs.readFile(file);
    response.writeHead(200, { ...securityHeaders, "content-type": mime[path.extname(file)] || "application/octet-stream" });
    response.end(bytes);
  } catch (error) {
    sendJson(response, error.code === "ENOENT" ? 404 : 500, { error: "Arquivo indisponível." });
  }
}

const server = createServer(async (request, response) => {
  let ownsWrite = false;
  try {
    if (request.headers.host !== `127.0.0.1:${port}`) return sendJson(response, 403, { error: "Acesso apenas pelo endereço local." });
    const url = new URL(request.url, origin);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true, editorialStorageVersion: 10, building: building || writing });
    }
    if (request.method === "GET" && url.pathname === "/api/review") {
      return sendJson(response, 200, await reviewQueue());
    }
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(302, { location: "/redacao/", ...securityHeaders });
      return response.end();
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      const [stories, overrides, drafts] = await Promise.all([
        catalog(), readJson(overridesPath, { schemaVersion: 1, stories: [] }), readJson(draftsPath, { schemaVersion: 1, drafts: [] })
      ]);
      return sendJson(response, 200, { csrf, stories, overrides: overrides.stories || [], placements: overrides.placements || [], sections, drafts: drafts.drafts || [], siteBase });
    }
    if (request.method === "POST" && ["/api/draft", "/api/publish", "/api/placement"].includes(url.pathname)) {
      if (request.headers.origin !== origin || request.headers["x-pauteiro-csrf"] !== csrf) return sendJson(response, 403, { error: "Sessão local inválida." });
      if (writing) return sendJson(response, 409, { error: "Há uma gravação em andamento. Aguarde." });
      writing = ownsWrite = true;
      const input = await readBody(request);
      const entry = normalizeEntry(input, url.pathname === "/api/draft" ? "draft" : "published");
      const choice = readChoice({...input, id:entry.id});
      const placementOnly = url.pathname === "/api/placement";
      const previous = await readJson(overridesPath, { schemaVersion: 1, stories: [] });
      const stories = await catalog();
      const original = stories.find((item) => item.id === entry.id) || null;
      if (entry.status === 'published' && original?.historicalAlego && choice.placement === 'capa') return sendJson(response, 400, {error:'A cobertura histórica da ALEGO fica nas editorias e no acervo.'});
      if (placementOnly && !original?.distributionEligible) return sendJson(response, 400, {error:"Escolha uma matéria publicada."});
      if (entry.status === "published" && original && !original.distributionEligible) return sendJson(response, 400, {error:"Esta unidade do acervo não participa da distribuição editorial."});
      if (!placementOnly) {
        const validation = validateStoryEntry(entry, original);
        if (!validation.valid) return sendJson(response, 400, { error: `Campos a corrigir: ${validation.issues.join(", ")}.` });
        if (entry.kind === "new" && entry.status === "published" && entry.id.startsWith("pauteiro-")) {
          const document = stories.find(item => item.recordType === "record" && `pauteiro-${item.id}` === entry.id);
          if (document && copiesDocumentBody(entry.paragraphs, document)) {
            return sendJson(response, 400, { error: "O corpo reproduz o registro documental. Escreva o que aconteceu e explique o alcance do ato antes de publicar." });
          }
        }
      }
      const published = new Set(stories.filter(s => s.distributionEligible).map(s => s.id));
      const site = await readJson(path.join(project, 'src/generated/site-data.json'), {});
      const issue = checkChoice(choice, published, previous.placements || [], {
        draft:entry.status === "draft", year:site.timeline.year, date:original?.date || entry.date
      });
      if (issue) return sendJson(response, 400, {error:issue});
      if (entry.status === "draft") {
        const drafts = await readJson(draftsPath, { schemaVersion: 1, drafts: [] });
        drafts.drafts = [...(drafts.drafts || []).filter((item) => item.id !== entry.id), {...entry, ...choice}];
        await atomicJson(draftsPath, drafts);
        return sendJson(response, 200, { ok: true, message: "Rascunho salvo somente neste computador." });
      }
      building = true;
      const priorEntry = previous.stories.find(s => s.id === entry.id);
      const next = withChoice(previous, choice, placementOnly ? null : {...priorEntry, ...entry});
      try {
        await atomicJson(overridesPath, next);
        await buildAndValidate();
        const drafts = await readJson(draftsPath, { schemaVersion: 1, drafts: [] });
        drafts.drafts = placementOnly ? (drafts.drafts || []).map(d => d.id === entry.id ? {...d, ...choice, relatedTo:choice.relatedTo || ''} : d)
          : (drafts.drafts || []).filter((item) => item.id !== entry.id);
        await atomicJson(draftsPath, drafts);
        return sendJson(response, 200, { ok: true, message: "Matéria aplicada e validada no site local. A versão pública ainda depende do envio do projeto.", localPath: `${siteBase}base/${entry.kind === "new" ? `julho-documento-${entry.id}` : original?.path.split("/").filter(Boolean).at(-1)}/` });
      } catch (error) {
        await atomicJson(overridesPath, previous);
        try { await buildAndValidate(); } catch { /* A falha original é informada ao editor. */ }
        return sendJson(response, 500, { error: `Publicação local revertida após falha: ${error.message}` });
      } finally { building = false; }
    }
    if (request.method === "GET" && (url.pathname === "/redacao/" || url.pathname.startsWith("/redacao/"))) {
      const relative = url.pathname === "/redacao/" ? "index.html" : url.pathname.slice("/redacao/".length);
      return serveFile(response, editorDir, relative);
    }
    if (request.method === "GET" && url.pathname.startsWith(siteBase)) {
      return serveFile(response, distDir, url.pathname.slice(siteBase.length));
    }
    return sendJson(response, 404, { error: "Endereço não encontrado." });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Falha na redação local." });
  } finally {
    if (ownsWrite) writing = false;
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Redação local: ${origin}/redacao/`);
  console.log(`Prévia do site: ${origin}${siteBase}`);
});
