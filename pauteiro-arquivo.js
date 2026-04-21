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
      analysis_status: "partial",
      entry_count: 8,
      manifest: "arquivo/2025/manifest.json",
      note: "primeiro lote factual de 2025 carregado em modo hibrido, com selo de procedencia para separar diario bruto, ato espelhado e noticia institucional."
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
      entries: [
        {
          date: "2025-01-02",
          city: "Goiania",
          scope: "Municipal",
          editoria: "Saude e gestao",
          tag: "Decreto",
          title: "Goiania decreta calamidade na Fazenda e na Saude na abertura da nova gestao",
          sublead: "Ato libera medidas excepcionais, remanejamento de servidores e prioridade para despesas emergenciais na rede municipal.",
          lead: "O Decreto n. 28/2025 declara estado de calamidade publica nas secretarias da Fazenda e da Saude, em meio ao deficit financeiro do municipio, a intervencao estadual na saude e ao estoque critico de medicamentos.",
          line: "Crise financeira e saude entram juntas em ato de alto impacto politico logo no primeiro dia util do ano.",
          summary: "O texto publicado no DOM 8448, de 2 de janeiro de 2025, permite tratamento emergencial de despesas, reforco de arrecadacao e remanejamento de servidores para a Saude de Goiania.",
          source_label: "Sileg Goiania",
          source_origin: "diario_bruto",
          source_origin_note: "Leitura feita diretamente no Sileg, com base no texto bruto do decreto publicado no DOM.",
          source_url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2025/dc_20250102_000000028.html",
          document_url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2025/dc_20250102_000000028.html",
          source_note: "DOM 8448, de 02/01/2025.",
          page_marker: "Decreto n. 28/2025.",
          accessed_at: "2026-04-21",
          image_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Goi%C3%A2nia%20GO.jpg",
          image_credit: "HVL/Wikimedia Commons",
          highlight_score: 5
        },
        {
          date: "2025-01-14",
          city: "Santo Antonio do Descoberto",
          scope: "Ministerio Publico",
          editoria: "Saude e controle publico",
          tag: "ACP / cumprimento de sentenca",
          title: "Apos acao do MPGO, Santo Antonio do Descoberto tera de prever verba para reformar hospital ou construir nova unidade",
          sublead: "Sentenca impone dotacao na LOA, regularizacao estrutural e continuidade de insumos e alvaras no Hospital Dom Luiz Fernandes.",
          lead: "Noticia oficial do MPGO informa que a decisao transitada em julgado obriga o municipio a incluir recursos no orcamento de 2025 para reformar o hospital municipal ou construir outra unidade na mesma regiao.",
          line: "Saude publica, orcamento e cobranca judicial aparecem juntos numa pauta de impacto regional.",
          summary: "A decisao destacada pelo MPGO tambem exige licencas e alvaras para funcionamento, fornecimento continuo de insumos e equipe suficiente para o Hospital Municipal Dom Luiz Fernandes.",
          source_label: "MPGO",
          source_origin: "noticia_institucional",
          source_origin_note: "Leitura puxada do portal de noticias do MPGO, e nao do DOMP bruto.",
          source_url: "https://www.mpgo.mp.br/portal/noticia/apos-sentenca-em-acao-do-mpgo-municipio-de-santo-antonio-do-descoberto-tera-que-tomar-providencias-para-reformar-hospital-ou-construir-nova-unidade",
          source_note: "Noticia oficial do MPGO, publicada em 14/01/2025, editoria Saude.",
          page_marker: "Sentenca com previsao de LOA 2025 e adequacao do Hospital Dom Luiz Fernandes.",
          accessed_at: "2026-04-21",
          image_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Santo%20Ant%C3%B4nio%20do%20Descoberto%20-%20State%20of%20Goi%C3%A1s%2C%20Brazil%20-%20panoramio.jpg",
          image_credit: "Panoramio/Wikimedia Commons",
          highlight_score: 5
        },
        {
          date: "2025-03-05",
          city: "Cristianopolis",
          scope: "Ministerio Publico",
          editoria: "Patrimonio publico e concursos",
          tag: "Recomendacao",
          title: "Apos recomendacao do MPGO, Cristianopolis rescinde contrato com banca de concurso e reabre o cronograma",
          sublead: "Promotoria apontou indicios de irregularidades da empresa em outros municipios e empurrou a troca da banca examinadora.",
          lead: "A prefeitura informou ao MPGO que rescindiu o contrato com o Itec, alvo de questionamentos em processos seletivos de outros municipios, e devera contratar uma nova empresa para tocar o concurso.",
          line: "Intervencao do MP atinge concurso publico e abre pauta sobre integridade de bancas em cidades pequenas.",
          summary: "Segundo o MPGO, a recomendacao enviada ao municipio mandava suspender o concurso regido pelo Edital 1/2024, rescindir o contrato e contratar nova banca em conformidade com o TAC firmado.",
          source_label: "MPGO",
          source_origin: "noticia_institucional",
          source_origin_note: "Leitura puxada do portal de noticias do MPGO, e nao do DOMP bruto.",
          source_url: "https://www.mpgo.mp.br/portal/noticia/apos-recomendacao-do-mpgo-prefeitura-de-cristianopolis-cancela-contrato-com-a-empresa-que-seria-responsavel-pela-realizacao-do-concurso-publico",
          source_note: "Noticia oficial do MPGO, publicada em 05/03/2025, editoria Patrimonio Publico.",
          page_marker: "Recomendacao ministerial e rescisao do contrato com o Itec.",
          accessed_at: "2026-04-21",
          highlight_score: 4
        },
        {
          date: "2025-03-21",
          city: "Goianira",
          scope: "Municipal",
          editoria: "Assistencia social e selecoes",
          tag: "Processo seletivo simplificado",
          title: "Goianira abre processo seletivo 001/2025 para contratacao temporaria na assistencia social",
          sublead: "Edital mira vagas e cadastro de reserva em areas tecnicas e operacionais da rede socioassistencial.",
          lead: "O edital publicado na AGM abre processo seletivo simplificado para a Secretaria de Promocao e Assistencia Social, com inscricoes em 26 e 27 de marco e resultado final previsto para 11 de abril.",
          line: "Cidade da Regiao Metropolitana poe assistencia social no radar com contratacao temporaria e cronograma curto.",
          summary: "A materia identificada pelo codigo DFDFA467 foi publicada na edicao 3328 do Diario Municipal de Goias e referencia a Lei Municipal 2.081/2025 para amparar a selecao temporaria.",
          source_label: "Diario Municipal de Goias | Goianira",
          source_origin: "diario_bruto",
          source_origin_note: "Leitura feita na materia bruta da AGM, com codigo identificador e edicao confirmados.",
          source_url: "https://www.diariomunicipal.com.br/agm/materia/DFDFA467/99eab034fa249602f5198539b3686ec099eab034fa249602f5198539b3686ec0",
          document_url: "https://www.diariomunicipal.com.br/agm/materia/DFDFA467/99eab034fa249602f5198539b3686ec099eab034fa249602f5198539b3686ec0",
          source_note: "Materia publicada no Diario Municipal de Goias em 21/03/2025. Edicao 3328.",
          page_marker: "Codigo DFDFA467 / Edital 001/2025.",
          accessed_at: "2026-04-21",
          highlight_score: 3
        },
        {
          date: "2025-05-23",
          city: "Abadiania",
          scope: "Ministerio Publico",
          editoria: "Patrimonio publico",
          tag: "ACP / recomendacao",
          title: "MPGO aciona Abadiania para travar gasto acima do orcamento com o 6o Rodeio Country",
          sublead: "Promotoria fala em sobrecarga orcamentaria, pede suspensao de empenhos e trava para promocao pessoal no evento.",
          lead: "Segundo o MPGO, o municipio pretendia gastar R$ 2,191 milhoes no rodeio, embora a previsao orcamentaria de 2025 para shows e festejos fosse de R$ 800 mil, com teto de R$ 1,44 milhao apos suplementacao.",
          line: "Gasto com festa vira pauta critica ao cruzar orcamento, recomendacao ignorada e pedido de multa diaria.",
          summary: "A noticia oficial informa que o MP expediu recomendacao em 14 de maio e depois ajuizou ACP para suspender despesas acima de R$ 1,44 milhao e vedar promocao pessoal de agentes publicos no evento.",
          source_label: "MPGO",
          source_origin: "noticia_institucional",
          source_origin_note: "Leitura puxada do portal de noticias do MPGO, e nao do DOMP bruto.",
          source_url: "https://www.mpgo.mp.br/portal/noticia/mpgo-propoe-acao-para-que-gastos-publicos-de-abadiania-com-eventos-festivos-fiquem-limitados-ao-orcamento-municipal",
          source_note: "Noticia oficial do MPGO, publicada em 23/05/2025, editoria Patrimonio Publico.",
          page_marker: "ACP com recomendacao expedida em 14/05/2025.",
          accessed_at: "2026-04-21",
          image_url: "https://www.mpgo.mp.br/portal//system/images/W1siZiIsIjIwMjIvMDcvMDEvMThfMjhfMzJfODUyX1Nob3dzX011bHRpZGFvX0Fkb2JlU3RvY2tfMzYxNTIyMDgzLmpwZWciXV0/Shows%20Multidao%20AdobeStock_361522083.jpeg?15577",
          image_credit: "MPGO/Adobe Stock",
          highlight_score: 5
        },
        {
          date: "2025-06-04",
          city: "Goiania",
          scope: "Municipal",
          editoria: "Gestao institucional",
          tag: "Decreto",
          title: "Goiania reorganiza o gabinete do prefeito e reforca a Casa Civil sobre atos, imprensa oficial e pessoal",
          sublead: "Mudanca mexe na engrenagem que publica, distribui e prepara atos administrativos da prefeitura.",
          lead: "O Decreto n. 2.715/2025 altera o regimento dos gabinetes do prefeito e do vice e redesenha a estrutura da Casa Civil, incluindo unidades de imprensa oficial, atos administrativos e atos de pessoal.",
          line: "Rearranjo interno atinge a maquina que produz decretos, pessoal e publicacao oficial.",
          summary: "O ato publicado em 4 de junho de 2025 tambem detalha o Gabinete de Trabalho Integrado e a nominata de cargos em comissao ligados a estrutura reorganizada.",
          source_label: "Sileg Goiania",
          source_origin: "diario_bruto",
          source_origin_note: "Leitura feita diretamente no Sileg, a partir do texto bruto do decreto.",
          source_url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2025/dc_20250604_000002715.html",
          document_url: "https://www.goiania.go.gov.br/html/gabinete_civil/sileg/dados/legis/2025/dc_20250604_000002715.html",
          source_note: "Sileg Goiania, publicado em 04/06/2025.",
          page_marker: "Decreto n. 2.715/2025.",
          accessed_at: "2026-04-21",
          image_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Goi%C3%A2nia%20GO.jpg",
          image_credit: "HVL/Wikimedia Commons",
          highlight_score: 4
        },
        {
          date: "2025-08-21",
          city: "Estado de Goias",
          scope: "Estadual",
          editoria: "Saude e contratos",
          tag: "Contrato",
          title: "SES-GO fecha contrato de R$ 1,49 milhao para bicicletas eletricas de agentes de saude",
          sublead: "Compra estadual leva mobilidade para ACS e reforca o eixo de atencao basica no interior.",
          lead: "O Contrato n. 76/2025, publicado em 21 de agosto de 2025, formaliza a aquisicao de bicicletas eletricas para agentes comunitarios de saude no ambito do programa Goias da Saude Integral.",
          line: "Saude publica abre pauta sobre capilaridade, logistica e gasto com mobilidade para a atencao basica.",
          summary: "O extrato informa valor de R$ 1.495.530,00, assinatura em 20/08/2025 e vigencia de 12 meses para a compra das bicicletas eletricas destinadas aos ACS.",
          source_label: "SES-GO",
          source_origin: "ato_espelhado",
          source_origin_note: "Leitura puxada da pagina oficial do extrato no portal da SES-GO, sem passar pela edicao bruta do DOE.",
          source_url: "https://goias.gov.br/saude/extrato-do-contrato-no-76-2025-ses-go/",
          document_url: "https://goias.gov.br/saude/extrato-do-contrato-no-76-2025-ses-go/",
          source_note: "Publicado em 21/08/2025.",
          page_marker: "Contrato n. 76/2025 / SISLOG 114830 / assinatura em 20/08/2025.",
          accessed_at: "2026-04-21",
          image_url: "https://goias.gov.br/saude/wp-content/uploads/sites/34/2024/01/0601-cemac-1024x684.jpg",
          image_credit: "SES-GO",
          highlight_score: 4
        },
        {
          date: "2025-09-15",
          city: "Estado de Goias",
          scope: "Estadual",
          editoria: "Saude e licitacoes",
          tag: "Pregao eletronico",
          title: "SES-GO abre pregao 245/2025 para medicamentos do CEMAC e marca sessao para 30 de setembro",
          sublead: "Registro de precos mira abastecimento estadual e deixa nova rodada de compra aberta no fim de setembro.",
          lead: "O aviso de licitacao do P.E. 245/2025 estima R$ 197.281,92 para aquisicao de medicamentos destinados ao CEMAC/SES e abre recebimento de propostas a partir de 17 de setembro.",
          line: "Nova compra de remedios entra na fila da saude estadual com sessao marcada e valor ja estimado.",
          summary: "A publicacao oficial da SES-GO foi feita em 15 de setembro de 2025, sob a categoria de pregao eletronico 2025, com sessao prevista para 30/09/2025 as 09h.",
          source_label: "SES-GO",
          source_origin: "ato_espelhado",
          source_origin_note: "Leitura puxada da pagina oficial do aviso no portal da SES-GO, sem passar pela edicao bruta do DOE.",
          source_url: "https://goias.gov.br/saude/aviso-de-licitacao-do-p-e-n-o-245-2025/",
          document_url: "https://goias.gov.br/saude/aviso-de-licitacao-do-p-e-n-o-245-2025/",
          source_note: "Publicado em 15/09/2025.",
          page_marker: "P.E. 245/2025 / SISLOG 115405 / sessao em 30/09/2025.",
          accessed_at: "2026-04-21",
          image_url: "https://goias.gov.br/saude/wp-content/uploads/sites/34/2024/01/0601-cemac-1024x684.jpg",
          image_credit: "SES-GO",
          highlight_score: 4
        }
      ],
      loaded_months: ["2025-01", "2025-03", "2025-05", "2025-06", "2025-08", "2025-09"],
      sources: {
        goiania: { status: "active", analysis_status: "partial", entry_count: 2, loaded_months: ["2025-01", "2025-06"], manifest: "arquivo/2025/goiania.json" },
        estado: { status: "active", analysis_status: "partial", entry_count: 2, loaded_months: ["2025-08", "2025-09"], manifest: "arquivo/2025/estado.json" },
        mpgo: { status: "active", analysis_status: "partial", entry_count: 3, loaded_months: ["2025-01", "2025-03", "2025-05"], manifest: "arquivo/2025/mpgo.json" },
        municipios: { status: "active", analysis_status: "partial", entry_count: 1, loaded_months: ["2025-03"], manifest: "arquivo/2025/municipios.json" },
        tjgo: { status: "paused", analysis_status: "paused", entry_count: 0, loaded_months: [], manifest: "arquivo/2025/tjgo.json" }
      },
      note: "primeiro lote factual carregado em modo hibrido; Goiania e AGM ja vieram do diario bruto, enquanto Estado e MPGO ainda entram por ato espelhado ou noticia institucional."
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
