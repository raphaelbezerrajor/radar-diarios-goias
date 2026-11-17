import fs from 'node:fs/promises';
import path from 'node:path';
import { projectEditorial } from './public-editorial-policy.mjs';
const source = process.argv[2] || process.env.PAUTEIRO_PRIVATE_DIR;
if (!source) throw Error('Informe a pasta editorial privada; não exportar do pacote público.');
const target = path.resolve('data/editorial');
if (path.resolve(source) === target) throw Error('Origem privada e destino público não podem coincidir.');
const names = ['curated-briefs.json','story-overrides.json','publication-holds.json','curation-queue.json'];
const docs = Object.fromEntries(await Promise.all(names.map(async name=>[name,JSON.parse(await fs.readFile(path.join(source,name),'utf8'))])));
const output = projectEditorial(docs);
await fs.mkdir(target,{recursive:true});
for (const [name,value] of Object.entries(output)) {
  await fs.writeFile(path.join(target,name)+'.tmp',JSON.stringify(value,null,2)+'\n');
  await fs.rename(path.join(target,name)+'.tmp',path.join(target,name));
}
console.log('Pacote editorial: somente campos públicos, curadoria aprovada e matérias publicadas.');
