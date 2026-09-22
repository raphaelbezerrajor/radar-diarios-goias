import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateStoryEntry } from "../src/lib/editorial/story-overrides.mjs";

const project = fileURLToPath(new URL("../", import.meta.url));
const workspace = path.resolve(project, "../..");
const editorDir = path.join(project, "editorial", "local");
const distDir = path.join(project, "dist");
const overridesPath = path.join(project, "data", "editorial", "story-overrides.json");
const draftsPath = process.env.PAUTEIRO_REDACTION_DRAFTS || path.join(workspace, "work", "pauteiro-editorial-drafts.json");
const recordsPath = path.join(project, "src", "generated", "site-records.json");
const siteBase = "/radar-diarios-goias/";
const port = Number(process.env.PAUTEIRO_REDACTION_PORT || 4317);
const origin = `http://127.0.0.1:${port}`;
const csrf = randomBytes(32).toString("hex");
let building = false;

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
  return records.filter((item) => item.recordType === "story").map((item) => ({
    id: item.id, path: item.path, city: item.city, date: item.date, scope: item.scope,
    type: item.type, importance: item.importance, title: item.title, deck: item.deck,
    paragraphs: item.paragraphs || [], sourceLabel: item.sourceLabel, sourceUrl: item.sourceUrl,
    sourceHash: item.sourceHash || "", documentReference: item.documentReference || item.sourceNote || "",
    recordType: item.recordType, publicationMode: item.publicationMode,
    editorialEntryId: item.editorialEntryId || null
  }));
}

function runNode(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: project, windowsHide: true });
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
  await runNode(["scripts/build-site-data.mjs"]);
  await runNode(["node_modules/astro/astro.js", "build"]);
  await runNode(["scripts/validate-news-policy.mjs"]);
  await runNode(["scripts/validate-site.mjs"]);
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
  try {
    if (request.headers.host !== `127.0.0.1:${port}`) return sendJson(response, 403, { error: "Acesso apenas pelo endereço local." });
    const url = new URL(request.url, origin);
    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(302, { location: "/redacao/", ...securityHeaders });
      return response.end();
    }
    if (request.method === "GET" && url.pathname === "/api/state") {
      const [stories, overrides, drafts] = await Promise.all([
        catalog(), readJson(overridesPath, { schemaVersion: 1, stories: [] }), readJson(draftsPath, { schemaVersion: 1, drafts: [] })
      ]);
      return sendJson(response, 200, { csrf, stories, overrides: overrides.stories || [], drafts: drafts.drafts || [], siteBase });
    }
    if (request.method === "POST" && ["/api/draft", "/api/publish"].includes(url.pathname)) {
      if (request.headers.origin !== origin || request.headers["x-pauteiro-csrf"] !== csrf) return sendJson(response, 403, { error: "Sessão local inválida." });
      if (building) return sendJson(response, 409, { error: "A redação está gerando o site. Aguarde." });
      const entry = normalizeEntry(await readBody(request), url.pathname === "/api/draft" ? "draft" : "published");
      const stories = await catalog();
      const original = stories.find((item) => item.id === entry.id) || null;
      const validation = validateStoryEntry(entry, original);
      if (!validation.valid) return sendJson(response, 400, { error: `Campos a corrigir: ${validation.issues.join(", ")}.` });
      if (entry.status === "draft") {
        const drafts = await readJson(draftsPath, { schemaVersion: 1, drafts: [] });
        drafts.drafts = [...(drafts.drafts || []).filter((item) => item.id !== entry.id), entry];
        await atomicJson(draftsPath, drafts);
        return sendJson(response, 200, { ok: true, message: "Rascunho salvo somente neste computador." });
      }
      building = true;
      const previous = await readJson(overridesPath, { schemaVersion: 1, stories: [] });
      const next = { schemaVersion: 1, stories: [...(previous.stories || []).filter((item) => item.id !== entry.id), entry] };
      try {
        await atomicJson(overridesPath, next);
        await buildAndValidate();
        const drafts = await readJson(draftsPath, { schemaVersion: 1, drafts: [] });
        drafts.drafts = (drafts.drafts || []).filter((item) => item.id !== entry.id);
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
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Redação local: ${origin}/redacao/`);
  console.log(`Prévia do site: ${origin}${siteBase}`);
});
