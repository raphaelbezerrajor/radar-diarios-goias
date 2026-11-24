import site from '../../generated/site-data.json';
export const pageSize = 13;
export const coverStories = [site.leadStory, ...site.heroSidebar].filter(Boolean);
export function pageProps(section, items, page = 1) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  return {section, page, pages, items: items.slice((page - 1) * pageSize, page * pageSize)};
}
