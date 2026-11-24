import site from '../../generated/site-data.json';
export const pageSize = 13;
export const coverStories = [site.leadStory, ...site.heroSidebar].filter(Boolean);
const cards = new Map(Object.values(site.desks).flat().map(story => [story.id, story]));
const archive = site.archiveStoryIds.map(id => cards.get(id));
const coverPages = Math.max(1, Math.ceil(coverStories.length / pageSize));
export const firstArchivePage = archive.length ? coverPages + 1 : null;
export const totalCoverPages = coverPages + Math.ceil(archive.length / pageSize);
export function coverPageProps(page) {
  const isArchive = page > coverPages;
  const listPage = isArchive ? page - coverPages : page;
  return {...pageProps('capa', isArchive ? archive : coverStories, listPage), page, pages:totalCoverPages, isArchive};
}

export function pageNumbers(current, total) {
  const visible = new Set([1, total]);
  const start = Math.max(1, Math.min(current - 1, total - 2));
  for (let n = start; n <= Math.min(total, start + 2); n++) visible.add(n);
  const numbers = [...visible].sort((a,b) => a-b);
  return numbers.flatMap((n,i) => {
    const distance = i ? n - numbers[i-1] : 0;
    return distance > 2 ? [null,n] : distance === 2 ? [n-1,n] : [n];
  });
}
export function pageProps(section, items, page = 1) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  return {section, page, pages, items: items.slice((page - 1) * pageSize, page * pageSize)};
}
