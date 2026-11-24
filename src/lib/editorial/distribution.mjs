import { recentFirst, isAlego, courtId } from './control-coverage.mjs';

export const sections = Object.freeze({
  controle: 'Controle público',
  obras: 'Obras e infraestrutura',
  contratos: 'Licitações e contratos',
  saude: 'Saúde',
  direitos: 'Direitos e cidadania'
});

const subjects = [
  ['saude', /\b(saude|hospital|maternidade|policlinica|medic|farmac|sus\b|ambulanc|vacina|ubs\b)/],
  ['obras', /\b(obra\b|obras\b|rodovia|pavimenta|infraestrutura|viaduto|saneamento|ponte\b|reforma\b|construcao|asfalt|drenagem|goinfra\b)/],
  ['controle', /\b(controladoria|tribunal de contas|prestacao de contas|auditoria|fiscalizacao|orcament|credito suplementar|responsabilidade fiscal)/],
  ['contratos', /\b(contrat|licit|pregao|dispensa|inexigibilidade|aditiv|homologa|adjudica|registro de precos|credenciamento)/]
];

export function sectionFor(story) {
  if (courtId(story)) return 'controle';
  const subject = [story.title, story.editoria, story.type].filter(Boolean).join(' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return subjects.find(([, pattern]) => pattern.test(subject))?.[0] || 'direitos';
}

export function distributionIssue(choice, stories, {draft = false} = {}) {
  if ((!draft || choice.sectionId) && !Object.hasOwn(sections, choice.sectionId)) return 'Escolha a editoria.';
  if ((!draft || choice.placement) && !['capa', 'editoria', 'relacionada'].includes(choice.placement)) return 'Escolha o destino da matéria.';
  if (choice.relatedTo || choice.placement === 'relacionada') {
    if (draft && !choice.relatedTo) return '';
    if (choice.relatedTo === choice.id || !stories.has(choice.relatedTo)) return 'Escolha outra matéria publicada para exibir a leitura relacionada.';
  }
  return '';
}

export function assignDistribution(records, choices, year) {
  const stories = new Map(records.filter(r => r.recordType === 'story').map(r => [r.id, r]));
  const placed = new Set();
  for (const choice of choices) {
    const story = stories.get(choice.id);
    if (!story || placed.has(choice.id)) throw Error('Distribuição sem matéria única e publicada: ' + choice.id);
    const issue = distributionIssue(choice, stories);
    if (issue) throw Error(choice.id + ': ' + issue);
    if (choice.placement === 'capa' && isAlego(story)) throw Error('A cobertura histórica da ALEGO fica nas editorias e no acervo.');
    placed.add(choice.id);
    Object.assign(story, {sectionId: choice.sectionId, placement: choice.placement});
    if (choice.relatedTo) story.relatedTo = choice.relatedTo;
  }
  const cover = [];
  const desks = Object.fromEntries(Object.keys(sections).map(id => [id, []]));
  for (const story of [...stories.values()].sort(recentFirst)) {
    if (!placed.has(story.id)) story.sectionId = sectionFor(story);
    if (story.relatedTo) {
      const parent = stories.get(story.relatedTo);
      if (parent.placement === 'relacionada') throw Error('A matéria principal também está marcada apenas como relacionada: ' + parent.id);
      (parent.relatedReads ||= []).push({path: story.path, title: story.title, date: story.date});
    }
    if (story.placement !== 'relacionada') {
      desks[story.sectionId].push(story);
      if (story.placement === 'capa' && Number(story.year) === year) cover.push(story);
    }
  }
  return {cover, desks};
}

// Os índices de acervo preservam todas as unidades. Listas gerais respeitam a escolha da redação.
export const inGeneralNews = story => !story.placement || story.placement === 'capa';
