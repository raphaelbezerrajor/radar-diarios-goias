const pick = (value, keys) => Object.fromEntries(keys.filter(k => value?.[k] !== undefined).map(k => [k, value[k]]));
const publicationKeys = ['title','deck','paragraphs','importance','city','promoteToStory'];
const storyKeys = ['kind','status','id','city','date','actDate','publishedAt','scope','type','importance','title','deck','paragraphs','publicBody','officialTitle','sourceLabel','sourceUrl','sourceHash','previewPage','documentReference','updatedAt'];
const correctionKeys = ['title','deck','paragraphs'];

export function projectEditorial(documents) {
  const briefs = (documents['curated-briefs.json']?.briefs || []).filter(x => x.status === 'approved').map(x => {
    const p = pick(x.editorial?.publication || {}, publicationKeys);
    if (!p.title || !p.deck || !Array.isArray(p.paragraphs) || p.paragraphs.length < 2 || !x.source?.documentSha256) throw Error(`Curadoria aprovada sem bloco público completo: ${x.id}`);
    return { id:x.id, status:'approved', publicProjection:1, source:pick(x.source,['documentSha256','documentReference']), editorial:{publication:p} };
  });
  const stories = (documents['story-overrides.json']?.stories || []).filter(x => x.status === 'published').map(x => {
    const result = pick(x, storyKeys);
    if (x.supportingSources) result.supportingSources = x.supportingSources.map(s => pick(s,['label','url']));
    return result;
  });
  const items = (documents['publication-holds.json']?.items || []).map(x => ({...pick(x,['id','documentSha256']), ...(x.archiveCorrection ? {archiveCorrection:pick(x.archiveCorrection,correctionKeys)} : {})}));
  return {
    'curated-briefs.json':{schemaVersion:1,briefs},
    'story-overrides.json':{schemaVersion:1,stories},
    'publication-holds.json':{schemaVersion:1,items},
    'curation-queue.json':{schemaVersion:1,candidates:[],invalidBriefs:[]}
  };
}

export function assertPublicEditorial(documents) {
  const projected = projectEditorial(documents);
  for (const name of Object.keys(projected)) {
    if (JSON.stringify(documents[name]) !== JSON.stringify(projected[name])) throw Error(`Pacote editorial contém estados ou campos privados: ${name}`);
  }
  return projected;
}
