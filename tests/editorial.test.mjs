import assert from "node:assert/strict";
import test from "node:test";
import { EDITORIAL_STATES, PUBLICATION_ADAPTER, canTransition, requiresMandatoryHumanReview } from "../src/lib/editorial/workflow.mjs";
import { buildBreadcrumbSchema, buildNewsArticleSchema, validateJsonLdSchema, validateStorySeo } from "../src/lib/editorial/seo.mjs";

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
