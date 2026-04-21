window.PAUTEIRO_ARCHIVE = {
  generated_at: "2026-04-21",
  search_storage: {
    mode: "localStorage",
    key: "pauteiro:search-history"
  },
  source_library: {
    goiania: {
      id: "goiania",
      label: "Goiania / Sileg",
      official_url: "https://www.goiania.go.gov.br/casa-civil/diario-oficial/",
      analysis_focus: "nomeacoes, decretos, contratos, compras, jetons, comissoes e reorganizacao administrativa",
      material_types: "diario oficial, sileg, decretos de pessoal, extratos de contrato e atos de governo",
      next_step: "carregar as edicoes de 2025 e fechar o retroativo de 2026 por atos de pessoal e contratos"
    },
    estado: {
      id: "estado",
      label: "Estado de Goias / DOE",
      official_url: "https://diariooficial.abc.go.gov.br/",
      analysis_focus: "notificacoes, devolucao, ressarcimento, dano ao erario, contratos, SES, SSP e autarquias",
      material_types: "diario oficial do estado, avisos, portarias, extratos, notificacoes e cobrancas",
      next_step: "varrer DOE, SES e SSP por notificacoes, cobrancas, contratos e extratos de saude"
    },
    mpgo: {
      id: "mpgo",
      label: "MPGO / DOMP",
      official_url: "https://www.mpgo.mp.br/portal/domp",
      analysis_focus: "inqueritos, recomendacoes, TACs, ACPs, arquivamentos e expedientes com impacto publico",
      material_types: "diario oficial do ministerio publico, editais, recomendacoes, inqueritos e termos",
      next_step: "abrir a coleta dos diarios do MPGO e cruzar recomendacoes, inqueritos e arquivamentos relevantes"
    },
    municipios: {
      id: "municipios",
      label: "Municipios / AGM e diarios proprios",
      official_url: "https://www.diariomunicipal.com.br/agm/",
      analysis_focus: "licitacoes, contratos, editais, nomeacoes, leis, gastos, shows, saude, educacao e urbanismo",
      material_types: "AGM, diarios municipais proprios, atos locais, extratos, leis e decretos",
      next_step: "escalar a ingestao por municipios e preencher os anos a partir da rota AGM ou diario proprio"
    },
    tjgo: {
      id: "tjgo",
      label: "TJGO / DJE",
      official_url: "https://www.tjgo.jus.br/index.php/processos/dj-eletronico",
      analysis_focus: "decisoes, plantoes, liminares, colegiados e atos do tribunal ainda em avaliacao editorial",
      material_types: "diario da justica eletronico e noticias do tribunal",
      next_step: "manter mapeado, mas fora da rodada atual ate fechar o criterio editorial do DJE"
    }
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
        goiania: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2024/goiania.json" },
        estado: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2024/estado.json" },
        mpgo: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2024/mpgo.json" },
        municipios: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2024/municipios.json" },
        tjgo: { status: "paused", analysis_status: "paused", entry_count: 0, loaded_months: [], manifest: "arquivo/2024/tjgo.json" }
      },
      note: "ano estruturado para ingestao"
    },
    "2025": {
      year: 2025,
      entries: [],
      loaded_months: [],
      sources: {
        goiania: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2025/goiania.json" },
        estado: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2025/estado.json" },
        mpgo: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2025/mpgo.json" },
        municipios: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2025/municipios.json" },
        tjgo: { status: "paused", analysis_status: "paused", entry_count: 0, loaded_months: [], manifest: "arquivo/2025/tjgo.json" }
      },
      note: "ano estruturado para ingestao"
    },
    "2026": {
      year: 2026,
      entries: [],
      loaded_months: ["2026-04"],
      sources: {
        goiania: { status: "active", analysis_status: "partial", entry_count: 1, loaded_months: ["2026-04"], manifest: "arquivo/2026/goiania.json" },
        estado: { status: "active", analysis_status: "partial", entry_count: 5, loaded_months: ["2026-04"], manifest: "arquivo/2026/estado.json" },
        mpgo: { status: "ready", analysis_status: "pending", entry_count: 0, loaded_months: [], manifest: "arquivo/2026/mpgo.json" },
        municipios: { status: "active", analysis_status: "partial", entry_count: 8, loaded_months: ["2026-04"], manifest: "arquivo/2026/municipios.json" },
        tjgo: { status: "paused", analysis_status: "paused", entry_count: 10, loaded_months: ["2026-04"], manifest: "arquivo/2026/tjgo.json" }
      },
      note: "as entradas factuais seguem em radar-diarios-goias-data.js ate a consolidacao do bucket anual"
    }
  }
};
