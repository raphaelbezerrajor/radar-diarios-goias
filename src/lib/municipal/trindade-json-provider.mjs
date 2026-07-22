import { readFile } from "node:fs/promises";
import path from "node:path";
import { MunicipalDataProvider, assertMunicipalDataProvider } from "./MunicipalDataProvider.mjs";

const DATASETS = Object.freeze({
  edicoes: "agm-index.json",
  atos: "agm-trindade-acts-search.json",
  analise: "agm-trindade-analysis-index.json",
  cobertura: "agm-trindade-coverage.json",
  noticias: "news-2026.json",
  camara: "camara-index.json",
  contabilidadeCamara: "camara-accounting-index.json",
  resultadosCamara: "camara-annual-results.json",
  legislativo: "camara-legislative-index.json",
  orcamento: "budget-execution-index.json",
  processosTCM: "tcmgo-trindade-decisions.json",
  coberturaTCM: "tcmgo-trindade-coverage.json",
  resumoTCM: "tcmgo-trindade-checked-summary.json",
  dossiesTCM: "tcmgo-trindade-process-dossiers.json",
  entidades: "company-profiles.json",
  compras: "agm-trindade-procurement.json",
  busca: "unified-search-index.json",
  estado: "data-status.json"
});

const text = (value) => String(value ?? "");
const normalize = (value) => text(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .replace(/\s+/g, " ")
  .trim();

const yearOf = (value) => Number(text(value).slice(0, 4)) || null;
const includesQuery = (values, query) => !query || normalize(values.filter(Boolean).join(" ")).includes(normalize(query));
const slice = (items, { offset = 0, limit = Number.POSITIVE_INFINITY } = {}) =>
  items.slice(Math.max(0, Number(offset) || 0), Number.isFinite(Number(limit)) ? Math.max(0, Number(offset) || 0) + Math.max(0, Number(limit) || 0) : undefined);

export function isPublicDocumentUrl(value) {
  return /^https?:\/\//i.test(text(value).trim());
}

export class TrindadeJsonDataProvider extends MunicipalDataProvider {
  constructor({ dataDir = path.resolve("data", "trindade") } = {}) {
    super();
    this.dataDir = path.resolve(dataDir);
    this.cache = new Map();
  }

  async readDataset(name) {
    const file = DATASETS[name];
    if (!file) throw new Error(`Dataset municipal desconhecido: ${name}`);
    if (!this.cache.has(name)) {
      this.cache.set(name, readFile(path.join(this.dataDir, file), "utf8").then((contents) => JSON.parse(contents)));
    }
    return this.cache.get(name);
  }

  async listarEdicoes({ ano, extraordinaria, offset, limit } = {}) {
    const data = await this.readDataset("edicoes");
    const items = (data.editions || []).filter((item) => {
      if (ano && yearOf(item.date) !== Number(ano)) return false;
      if (typeof extraordinaria === "boolean" && Boolean(item.extraordinary) !== extraordinaria) return false;
      return true;
    });
    return slice(items, { offset, limit });
  }

  async buscarAtos({ consulta, tipo, orgao, ano, offset, limit } = {}) {
    const data = await this.readDataset("atos");
    const items = (data.acts || []).filter((item) => {
      if (tipo && normalize(item.act_type) !== normalize(tipo)) return false;
      if (orgao && normalize(item.public_body) !== normalize(orgao)) return false;
      if (ano && yearOf(item.edition_date) !== Number(ano)) return false;
      return includesQuery([
        item.id,
        item.title,
        item.summary,
        item.public_body,
        item.administrative_unit,
        ...(item.cnpjs || []),
        ...(item.reference_numbers || [])
      ], consulta);
    });
    return slice(items, { offset, limit });
  }

  async obterAto(id) {
    if (!id) return null;
    const data = await this.readDataset("atos");
    return (data.acts || []).find((item) => item.id === id) || null;
  }

  async listarNoticias({ consulta, categoria, ano, offset, limit } = {}) {
    const data = await this.readDataset("noticias");
    const items = (data.items || []).filter((item) => {
      if (categoria && normalize(item.category) !== normalize(categoria)) return false;
      if (ano && yearOf(item.published_at) !== Number(ano)) return false;
      return includesQuery([item.title, item.deck, ...(item.paragraphs || []), ...(item.tags || [])], consulta);
    });
    return slice(items, { offset, limit });
  }

  async obterNoticia(idOuSlug) {
    if (!idOuSlug) return null;
    const data = await this.readDataset("noticias");
    return (data.items || []).find((item) => item.id === idOuSlug || item.slug === idOuSlug) || null;
  }

  async listarProposicoes({ consulta, ano, status, autor, offset, limit } = {}) {
    const data = await this.readDataset("legislativo");
    const items = (data.propositions || []).filter((item) => {
      if (ano && Number(item.year) !== Number(ano)) return false;
      if (status && normalize(item.status) !== normalize(status)) return false;
      if (autor && !includesQuery(item.authors || [], autor)) return false;
      return includesQuery([item.title, item.identification, item.subject, ...(item.authors || [])], consulta);
    });
    return slice(items, { offset, limit });
  }

  async listarProcessosTCM({ consulta, ano, categoria, verificacao, offset, limit } = {}) {
    const data = await this.readDataset("processosTCM");
    const items = (data.decisions || []).filter((item) => {
      if (ano && yearOf(item.edition_date) !== Number(ano)) return false;
      if (categoria && !(item.categories || []).some((value) => normalize(value) === normalize(categoria))) return false;
      if (verificacao && normalize(item.verification_status) !== normalize(verificacao)) return false;
      return includesQuery([
        item.id,
        item.process_number,
        item.decision_number,
        item.nature,
        item.body,
        item.relator,
        item.summary,
        ...(item.categories || [])
      ], consulta);
    });
    return slice(items, { offset, limit });
  }

  async obterEstadoDaBase() {
    return this.readDataset("estado");
  }

  async buscarEntidades(consulta, { offset, limit } = {}) {
    const data = await this.readDataset("entidades");
    const items = (data.profiles || []).filter((item) => includesQuery([
      item.cnpj,
      item.slug,
      item.name,
      ...(item.aliases || [])
    ], consulta));
    return slice(items, { offset, limit });
  }

  async obterEntidade(id) {
    if (!id) return null;
    const key = normalize(id).replace(/\D/g, "") || normalize(id);
    const data = await this.readDataset("entidades");
    return (data.profiles || []).find((item) => {
      const cnpj = normalize(item.cnpj).replace(/\D/g, "");
      return cnpj === key || normalize(item.slug) === normalize(id);
    }) || null;
  }

  async buscarRegistros({ consulta, tipo, ano, offset, limit } = {}) {
    const data = await this.readDataset("busca");
    const items = (data.records || []).filter((item) => {
      if (tipo && normalize(item.type) !== normalize(tipo)) return false;
      if (ano && yearOf(item.date) !== Number(ano)) return false;
      return includesQuery([item.search, item.title, item.subtitle, item.summary, ...(item.tags || [])], consulta);
    });
    return slice(items, { offset, limit });
  }

  async obterRegistro(id) {
    if (!id) return null;
    const data = await this.readDataset("busca");
    return (data.records || []).find((item) => item.id === id) || null;
  }

  async obterAnalise() { return this.readDataset("analise"); }
  async obterCoberturaDiario() { return this.readDataset("cobertura"); }
  async obterCamara() { return this.readDataset("camara"); }
  async obterContabilidadeCamara() { return this.readDataset("contabilidadeCamara"); }
  async obterResultadosCamara() { return this.readDataset("resultadosCamara"); }
  async obterLegislativo() { return this.readDataset("legislativo"); }
  async obterOrcamento() { return this.readDataset("orcamento"); }
  async obterResumoTCM() { return this.readDataset("resumoTCM"); }
  async obterCoberturaTCM() { return this.readDataset("coberturaTCM"); }
  async obterDossiesTCM() { return this.readDataset("dossiesTCM"); }
  async obterCompras() { return this.readDataset("compras"); }
}

export function createTrindadeJsonProvider(options) {
  return assertMunicipalDataProvider(new TrindadeJsonDataProvider(options));
}

export { DATASETS as TRINDADE_DATASETS };

