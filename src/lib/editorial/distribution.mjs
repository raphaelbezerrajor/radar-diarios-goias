import { recentFirst, isAlego } from './control-coverage.mjs';

export const sections = Object.freeze({
  controle: 'Controle público',
  obras: 'Obras e infraestrutura',
  contratos: 'Licitações e contratos',
  saude: 'Saúde',
  direitos: 'Direitos e cidadania'
});

export function distributionIssue(choice, stories, {draft = false} = {}) {
  if ((!draft || choice.sectionId) && !Object.hasOwn(sections, choice.sectionId)) return 'Escolha a editoria.';
  if ((!draft || choice.placement) && !['capa', 'editoria', 'relacionada'].includes(choice.placement)) return 'Escolha o destino da matéria.';
  if (choice.placement === 'relacionada') {
    if (draft && !choice.relatedTo) return '';
    if (choice.relatedTo === choice.id || !stories.has(choice.relatedTo)) return 'Escolha outra matéria publicada para exibir a leitura relacionada.';
  } else if (choice.relatedTo) return 'O vínculo com a matéria principal exige o destino de leitura relacionada.';
  return '';
}

export function assignDistribution(records, choices, year) {
  const stories = new Map(records.filter(r => r.recordType === 'story' && !isAlego(r)).map(r => [r.id, r]));
  const placed = new Set();
  for (const choice of choices) {
    const story = stories.get(choice.id);
    if (!story || placed.has(choice.id)) throw Error('Distribuição sem matéria única e publicada: ' + choice.id);
    const issue = distributionIssue(choice, stories);
    if (issue) throw Error(choice.id + ': ' + issue);
    placed.add(choice.id);
    Object.assign(story, {sectionId: choice.sectionId, placement: choice.placement});
    if (choice.placement === 'relacionada') story.relatedTo = choice.relatedTo;
  }
  const cover = [];
  const desks = Object.fromEntries(Object.keys(sections).map(id => [id, []]));
  for (const story of [...placed].map(id => stories.get(id)).sort(recentFirst)) {
    if (story.placement === 'relacionada') {
      const parent = stories.get(story.relatedTo);
      if (parent.placement === 'relacionada') throw Error('A matéria principal também está marcada apenas como relacionada: ' + parent.id);
      (parent.relatedReads ||= []).push({path: story.path, title: story.title, date: story.date});
    } else {
      desks[story.sectionId].push(story);
      if (story.placement === 'capa' && Number(story.year) === year) cover.push(story);
    }
  }
  return {cover, desks};
}

// Os índices de acervo preservam todas as unidades. Listas gerais respeitam a escolha da redação.
export const inGeneralNews = story => !story.placement || story.placement === 'capa';
