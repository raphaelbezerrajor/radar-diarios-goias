import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Read-only inventory. No content, credentials or personal data in the report.
const root = 'D:/Pauteiro';
const ignored = new Set(['node_modules', '.git', 'dist', '.astro', '.runtime', '.python-packages', '.venv', '__pycache__']);
const groups = {}, errors = [], skipped = [], files = [];
function classify(rel) {
  if (/^(private|work|backups|recovery)\//.test(rel) || /\/data\/(editorial|analysis|processed|rejected|index|export)\//.test(rel)) return 'private';
  if (/\/data\/raw\//.test(rel)) return 'original_review_required';
  if (/\/data\/(public|trindade)\//.test(rel)) return 'public_candidate_not_approved';
  if (/\/public\//.test(rel)) return 'public_delivery_requires_review';
  if (/\/src\/generated\//.test(rel)) return 'derived';
  return 'internal_or_code';
}
function walk(dir, rel = '') {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { errors.push({ path: rel, code: e.code }); return; }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name, p = path.join(dir, e.name);
    if (ignored.has(e.name)) { skipped.push(r); continue; }
    if (e.isSymbolicLink()) { skipped.push(r); continue; }
    if (e.isDirectory()) { walk(p, r); continue; }
    if (!e.isFile()) continue;
    try {
      const s = fs.statSync(p);
      const classification = classify(r);
      const group = r.startsWith('apps/') ? r.split('/').slice(0, 4).join('/') : r.split('/')[0];
      const key = `${classification}:${group}`;
      const g = groups[key] ||= { classification, path: group, files: 0, bytes: 0 };
      g.files++; g.bytes += s.size;
      if (/^apps\/(pauteiro|trindade-aberta)\/data\/(editorial|public|trindade)\/[^/]+$/.test(r) || r === 'work/pauteiro-editorial-drafts.json') files.push({path:r,bytes:s.size,modified:s.mtime.toISOString(),classification});
    } catch (e) { errors.push({path:r,code:e.code}); }
  }
}
walk(root);
for (const file of files) {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(path.join(root, file.path))) hash.update(chunk);
  file.sha256 = hash.digest('hex');
}
console.log(JSON.stringify({schemaVersion:1,createdAt:new Date().toISOString(),root,scope:'Directory counts for project; individual hashes for top-level canonical public/editorial datasets and local drafts. Classification is conservative, not privacy clearance.',groups:Object.values(groups),files,errors,skippedGroups:skipped.reduce((a,r)=>{const k=r.split('/').at(-1);a[k]=(a[k]||0)+1;return a;},{})}));
