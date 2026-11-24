import { distributionIssue } from '../src/lib/editorial/distribution.mjs';

export function readChoice(input) {
  const { id, sectionId, placement, relatedTo } = input;
  return {id, sectionId, placement, ...(relatedTo ? {relatedTo} : {})};
}

export function checkChoice(choice, published, previous, {draft, year, date}) {
  const issue = distributionIssue(choice, published, {draft});
  if (issue || draft) return issue;
  if (choice.placement === 'capa' && Number(String(date).slice(0,4)) !== year) return 'A capa reúne matérias do ano corrente. Escolha a editoria ou uma leitura relacionada.';
  if (previous.some(p => p.id === choice.relatedTo && p.placement === 'relacionada')) return 'A matéria principal precisa estar disponível fora de Leia também.';
  if (choice.placement === 'relacionada' && previous.some(p => p.relatedTo === choice.id)) return 'Esta matéria apresenta outras leituras. Reatribua esses vínculos antes de mudar o destino.';
  return '';
}

export function withChoice(previous, choice, storyUpdate) {
  return {
    ...previous,
    stories: storyUpdate ? [...previous.stories.filter(s => s.id !== choice.id), storyUpdate] : previous.stories,
    placements: [...(previous.placements || []).filter(p => p.id !== choice.id), choice]
  };
}
