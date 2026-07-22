export const basePath = import.meta.env.BASE_URL;
const normalizedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;

export function withBase(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${normalizedBasePath}${String(url).replace(/^\//, "")}`;
}

export function formatDate(value) {
  if (!value) return "Sem data";
  const text = String(value);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(`${text}T12:00:00`)
    : new Date(text);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsed);
}

export function formatCurrency(value) {
  if (!value) return "Sem valor declarado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(value);
}

export function compactNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(Number(value || 0));
}
