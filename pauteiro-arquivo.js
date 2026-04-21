window.PAUTEIRO_ARCHIVE = {
  generated_at: "2026-04-21",
  search_storage: {
    mode: "localStorage",
    key: "pauteiro:search-history"
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
      note: "ano estruturado para ingestao"
    },
    "2025": {
      year: 2025,
      entries: [],
      loaded_months: [],
      note: "ano estruturado para ingestao"
    },
    "2026": {
      year: 2026,
      entries: [],
      loaded_months: ["2026-04"],
      note: "as entradas factuais seguem em radar-diarios-goias-data.js ate a consolidacao do bucket anual"
    }
  }
};
