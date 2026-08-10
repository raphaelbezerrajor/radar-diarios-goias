import assert from "node:assert/strict";
import test from "node:test";
import { EDITORIAL_STATES, PUBLICATION_ADAPTER, canTransition, requiresMandatoryHumanReview } from "../src/lib/editorial/workflow.mjs";
import { buildBreadcrumbSchema, buildNewsArticleSchema, validateJsonLdSchema, validateStorySeo } from "../src/lib/editorial/seo.mjs";
import { assessActNewsValue, assessTcmNewsValue } from "../src/lib/editorial/document-news.mjs";
import {
  applyApprovedCuration,
  evaluateCurationCandidate,
  selectCurationCandidates,
  validateEditorialBrief
} from "../src/lib/editorial/curation.mjs";
import { buildFrontPagePackage, rankFrontPageStories } from "../src/lib/editorial/front-page.mjs";

test("a manchete compete por força editorial sem reserva para uma cidade ou curadoria", () => {
  const stories = [
    {
      id: "trindade-curada",
      recordType: "story",
      city: "Trindade",
      date: "2026-07-23",
      importance: 77,
      prominence: "cover",
      publicationMode: "curated_document_news"
    },
    {
      id: "palmeiras-atual",
      recordType: "story",
      city: "Palmeiras",
      date: "2026-08-10",
      importance: 95,
      prominence: "cover",
      publicationMode: "automatic_document_news"
    }
  ];

  assert.equal(rankFrontPageStories(stories).at(0).id, "palmeiras-atual");
});

test("uma pauta excepcional pode superar uma pauta ligeiramente mais recente", () => {
  const ranked = rankFrontPageStories([
    { id: "atual", recordType: "story", city: "A", date: "2026-08-10", importance: 95, prominence: "cover" },
    { id: "forte", recordType: "story", city: "B", date: "2026-08-09", importance: 100, prominence: "cover" }
  ]);

  assert.equal(ranked.at(0).id, "forte");
});

test("os destaques laterais evitam repetir o município enquanto houver alternativa", () => {
  const stories = [
    { id: "a1", recordType: "story", city: "A", date: "2026-08-10", importance: 99 },
    { id: "a2", recordType: "story", city: "A", date: "2026-08-10", importance: 98 },
    { id: "b1", recordType: "story", city: "B", date: "2026-08-10", importance: 90 },
    { id: "c1", recordType: "story", city: "C", date: "2026-08-10", importance: 80 },
    { id: "d1", recordType: "story", city: "D", date: "2026-08-10", importance: 70 }
  ];
  const frontPage = buildFrontPagePackage(stories);

  assert.deepEqual(frontPage.sidebar.map((item) => item.city), ["B", "C", "D"]);
});

test("separa valor-notícia de rotina burocrática", () => {
  const routine = assessActNewsValue({
    act_type: "portaria",
    title: "Portaria nº 124",
    summary: "Concede uma diária sem pernoite para deslocamento de servidor."
  });
  const contract = assessActNewsValue({
    act_type: "extrato_de_contrato",
    title: "Extrato de contrato nº 58/2026",
    summary: "Contratação de apresentação artística para o festival municipal.",
    cnpjs: ["00.000.000/0001-00"]
  }, 300_000);
  assert.equal(routine.publish, false);
  assert.equal(contract.publish, true);
  assert.ok(contract.score >= 85);
});

test("prioriza punição e correção do TCM sobre registro regular", () => {
  const sanction = assessTcmNewsValue({ amounts: [{ value: "R$ 1.000" }] }, { result: "proposta_tecnica_de_irregularidade_e_multa" });
  const routine = assessTcmNewsValue({}, { result: "ato_considerado_legal_e_registrado" });
  assert.equal(sanction.publish, true);
  assert.equal(routine.publish, false);
});

test("publica automaticamente somente matéria apoiada em documento oficial", () => {
  assert.equal(EDITORIAL_STATES.includes("publicada"), true);
  assert.equal(PUBLICATION_ADAPTER.status, "active");
  assert.equal(PUBLICATION_ADAPTER.automaticPublishing, true);
  const result = canTransition({
    from: "detectada",
    to: "publicada",
    story: {
      publicationMode: "automatic_document_news",
      sourceType: "official_document",
      sourceUrl: "https://diario.exemplo.go.gov.br/edicao.pdf",
      title: "Prefeitura publica edital",
      deck: "Documento define datas e condições.",
      paragraphs: ["O edital foi publicado.", "A íntegra está na fonte oficial."],
      date: "2026-07-22"
    }
  });
  assert.deepEqual(result, { allowed: true, issues: [] });
});

test("bloqueia reportagem institucional na coleta automática", () => {
  const result = canTransition({
    from: "detectada",
    to: "publicada",
    story: {
      publicationMode: "automatic_document_news",
      sourceType: "official_document",
      sourceUrl: "https://prefeitura.go.gov.br/noticias/festa",
      title: "Prefeitura anuncia festa",
      deck: "Texto institucional.",
      paragraphs: ["Primeiro parágrafo.", "Segundo parágrafo."],
      date: "2026-07-22"
    }
  });
  assert.equal(result.allowed, false);
  assert.ok(result.issues.includes("reportagem_institucional_bloqueada"));
});

test("bloqueia aprovação sem segurança editorial", () => {
  const result = canTransition({
    from: "em_edicao",
    to: "aprovada",
    story: { tituloEditorial: "Investigação sobre contrato", fontes: [] },
    review: {}
  });
  assert.equal(result.allowed, false);
  assert.ok(result.issues.includes("fontes_identificadas"));
  assert.ok(result.issues.includes("revisao_humana_obrigatoria"));
  assert.equal(requiresMandatoryHumanReview({ tituloEditorial: "Multa aplicada em contrato" }), true);
});

test("libera aprovação completa com revisão humana", () => {
  const result = canTransition({
    from: "em_edicao",
    to: "aprovada",
    story: {
      tituloEditorial: "Análise de contrato controverso",
      fontes: [{ url: "https://example.org" }],
      documentosRelacionados: ["doc-1"],
      autor: "Redação",
      editor: "Editor",
      historicoAlteracoes: [{ versao: 1 }],
      trechosIa: [],
      contraditorioAplicavel: true
    },
    review: {
      responsavel: "Editor",
      status: "aprovada",
      revisaoHumanaObrigatoria: true,
      contraditorio: "Resposta registrada."
    }
  });
  assert.deepEqual(result, { allowed: true, issues: [] });
});

test("valida metadados e constrói schemas editoriais", () => {
  const story = {
    tituloEditorial: "Título",
    tituloSeo: "Título | Pauteiro",
    slug: "titulo",
    metadescricao: "Descrição",
    corpoHtml: "<p>Texto</p>",
    autor: "Pauteiro",
    fontes: [{ url: "https://example.org/fonte" }],
    dataPublicacao: "2026-07-22",
    dataAtualizacao: "2026-07-22",
    canonical: "https://example.org/titulo",
    linksInternos: ["/base/documento/"]
  };
  assert.deepEqual(validateStorySeo(story, { knownInternalPaths: ["/base/documento/"] }), { valid: true, issues: [] });
  const article = buildNewsArticleSchema({ story, canonical: story.canonical });
  assert.equal(article["@type"], "NewsArticle");
  assert.deepEqual(validateJsonLdSchema(article), { valid: true, issues: [] });
  assert.equal(buildBreadcrumbSchema([{ name: "Capa", url: "https://example.org" }]).itemListElement.length, 1);
});

test("detecta link interno quebrado e schema editorial incompleto", () => {
  const result = validateStorySeo({
    tituloEditorial: "Título",
    tituloSeo: "Título",
    slug: "titulo",
    metadescricao: "Descrição",
    autor: "Pauteiro",
    fontes: [{ url: "https://example.org" }],
    dataPublicacao: "2026-07-22",
    dataAtualizacao: "2026-07-22",
    canonical: "https://example.org/titulo",
    linksInternos: ["/inexistente/"]
  }, { knownInternalPaths: ["/existente/"] });
  assert.equal(result.valid, false);
  assert.ok(result.issues.includes("link_interno_quebrado:/inexistente/"));
  assert.equal(validateJsonLdSchema({ "@context": "https://schema.org", "@type": "NewsArticle" }).valid, false);
});

test("envia apenas pautas relevantes e documentadas para curadoria", () => {
  const routine = evaluateCurationCandidate({
    id: "rotina",
    importance: 30,
    official_url: "https://diario.exemplo.go.gov.br/rotina.pdf",
    evidence_excerpt: "Concede férias a servidor."
  });
  const relevant = evaluateCurationCandidate({
    id: "contrato",
    city: "Trindade",
    importance: 91,
    official_url: "https://diario.exemplo.go.gov.br/contrato.pdf",
    evidence_excerpt: "Contrato de obra da rede municipal de saúde."
  });
  assert.equal(routine.eligible, false);
  assert.equal(relevant.eligible, true);
  assert.ok(relevant.reasons.includes("alto valor-notícia calculado"));
});

test("fila de curadoria respeita data, prioridade e limite diário", () => {
  const items = Array.from({ length: 4 }, (_, index) => ({
    id: `ato-${index}`,
    date: index === 3 ? "2026-07-22" : "2026-07-23",
    city: "Trindade",
    importance: 95 - index,
    official_url: `https://diario.exemplo.go.gov.br/${index}.pdf`,
    evidence_excerpt: "Contrato para serviço público."
  }));
  const queue = selectCurationCandidates(items, [], { maximumPerDate: 2, maximumPerRun: 3 });
  assert.deepEqual(queue.map((item) => item.id), ["ato-0", "ato-1", "ato-3"]);
  assert.ok(queue.every((item) => item.status === "pending"));
});

test("curadoria só altera matéria depois de aprovação humana registrada", () => {
  const record = {
    id: "ato-1",
    title: "Título burocrático",
    deck: "Olho burocrático.",
    paragraphs: ["Parágrafo um.", "Parágrafo dois."],
    sourceHash: "abc"
  };
  const draft = {
    id: "ato-1",
    status: "draft",
    editorial: {
      mainAngle: "Impacto no atendimento",
      whyItMatters: "Afeta a rede pública.",
      headlineOptions: ["Título A", "Título B"],
      reportingQuestions: ["Quanto será pago?", "Qual é o prazo?"],
      verifiedFacts: ["O contrato foi publicado."],
      doNotState: [],
      publication: { title: "Novo título", deck: "Novo olho.", paragraphs: ["Lead.", "Contexto."] }
    }
  };
  assert.equal(applyApprovedCuration(record, draft).title, "Título burocrático");

  const approved = {
    ...draft,
    status: "approved",
    source: { documentSha256: "abc" },
    humanReview: { approvedBy: "Editor", approvedAt: "2026-07-23T12:00:00Z" }
  };
  const validation = validateEditorialBrief(approved);
  assert.equal(validation.valid, true);
  assert.equal(applyApprovedCuration(record, approved).title, "Novo título");
});
