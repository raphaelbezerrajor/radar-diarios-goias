window.PAUTEIRO_ARCHIVE = {
  generated_at: "2026-04-21",
  search_storage: {
    mode: "localStorage",
    key: "pauteiro:search-history"
  },
  ingestion: {
    active_order: [
      {
        id: "goiania",
        label: "Goiania / Sileg",
        status: "active",
        priority: 1,
        years: [2025, 2026],
        note: "Primeira frente de ingestao para nomeacoes, decretos, contratos, jetons e compras."
      },
      {
        id: "estado",
        label: "Estado de Goias / DOE",
        status: "active",
        priority: 2,
        years: [2025, 2026],
        note: "Segunda frente de ingestao para DOE, SES, SSP e autarquias."
      },
      {
        id: "mpgo",
        label: "MPGO / DOMP",
        status: "active",
        priority: 3,
        years: [2025, 2026],
        note: "Terceira frente para inqueritos, recomendacoes, TACs, ACPs e arquivamentos."
      },
      {
        id: "municipios",
        label: "Municipios / AGM e diarios proprios",
        status: "active",
        priority: 4,
        years: [2025, 2026],
        note: "Quarta frente para escalar a cobertura municipal dos 246 municipios."
      }
    ],
    paused: [
      {
        id: "tjgo",
        label: "TJGO / DJE",
        status: "paused",
        years: [2025, 2026],
        note: "Fonte mapeada, mas pausada ate avaliacao editorial mais firme do material do DJE."
      }
    ]
  },
  years: [
    {
      year: 2024,
      status: "mapped",
      analysis_status: "pending",
      entry_count: 0,
      manifest: "arquivo/2024/manifest.json",
      note: "bucket anual aberto para ingestao historica; sem entradas carregadas nesta versao publica."
    },
    {
      year: 2025,
      status: "mapped",
      analysis_status: "pending",
      entry_count: 0,
      manifest: "arquivo/2025/manifest.json",
      note: "bucket anual aberto para ingestao historica; sem entradas carregadas nesta versao publica."
    },
    {
      year: 2026,
      status: "active",
      analysis_status: "partial",
      entry_count: 24,
      manifest: "arquivo/2026/manifest.json",
      note: "bucket anual ativo; as entradas de abril seguem na base principal enquanto a migracao anual nao fecha."
    }
  ],
  year_buckets: {
    "2024": {
      year: 2024,
      entries: [],
      loaded_months: [],
      sources: {
        goiania: { status: "ready", entry_count: 0, loaded_months: [] },
        estado: { status: "ready", entry_count: 0, loaded_months: [] },
        mpgo: { status: "ready", entry_count: 0, loaded_months: [] },
        municipios: { status: "ready", entry_count: 0, loaded_months: [] },
        tjgo: { status: "paused", entry_count: 0, loaded_months: [] }
      },
      note: "ano estruturado para ingestao"
    },
    "2025": {
      year: 2025,
      entries: [],
      loaded_months: [],
      sources: {
        goiania: { status: "ready", entry_count: 0, loaded_months: [] },
        estado: { status: "ready", entry_count: 0, loaded_months: [] },
        mpgo: { status: "ready", entry_count: 0, loaded_months: [] },
        municipios: { status: "ready", entry_count: 0, loaded_months: [] },
        tjgo: { status: "paused", entry_count: 0, loaded_months: [] }
      },
      note: "ano estruturado para ingestao"
    },
    "2026": {
      year: 2026,
      entries: [],
      loaded_months: ["2026-04"],
      sources: {
        goiania: { status: "active", entry_count: 1, loaded_months: ["2026-04"] },
        estado: { status: "active", entry_count: 5, loaded_months: ["2026-04"] },
        mpgo: { status: "ready", entry_count: 0, loaded_months: [] },
        municipios: { status: "active", entry_count: 8, loaded_months: ["2026-04"] },
        tjgo: { status: "paused", entry_count: 10, loaded_months: ["2026-04"] }
      },
      note: "as entradas factuais seguem em radar-diarios-goias-data.js ate a consolidacao do bucket anual"
    }
  }
};
