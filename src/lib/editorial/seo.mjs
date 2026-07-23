const absoluteHttpUrl = (value) => /^https?:\/\//i.test(String(value || ""));

export function validateJsonLdSchema(schema = {}) {
  const issues = [];
  if (schema["@context"] !== "https://schema.org") issues.push("contexto_invalido");
  if (!schema["@type"]) issues.push("tipo_ausente");
  if (schema["@type"] === "NewsArticle") {
    if (!schema.headline) issues.push("headline_ausente");
    if (!schema.datePublished) issues.push("data_publicacao_ausente");
    if (!schema.mainEntityOfPage || !absoluteHttpUrl(schema.mainEntityOfPage)) issues.push("pagina_principal_invalida");
    if (!schema.author?.name) issues.push("autoria_ausente");
    if (!schema.publisher?.name) issues.push("publicador_ausente");
  }
  if (schema["@type"] === "BreadcrumbList" && !Array.isArray(schema.itemListElement)) {
    issues.push("itens_de_navegacao_ausentes");
  }
  return { valid: issues.length === 0, issues };
}

export function validateStorySeo(story = {}, { knownInternalPaths } = {}) {
  const issues = [];
  if (!story.tituloEditorial) issues.push("titulo_ausente");
  if (!story.tituloSeo) issues.push("titulo_seo_ausente");
  if (!story.slug) issues.push("slug_vazio");
  if (!story.metadescricao) issues.push("metadescricao_ausente");
  const h1Count = (String(story.corpoHtml || "").match(/<h1\b/gi) || []).length;
  if (h1Count > 0) issues.push("h1_no_corpo");
  if (story.imagem && !story.imagem.alt) issues.push("imagem_sem_texto_alternativo");
  if (story.imagem && !story.imagem.credito) issues.push("imagem_sem_credito");
  if (!story.autor) issues.push("autoria_ausente");
  if (!Array.isArray(story.fontes) || story.fontes.length === 0) issues.push("fonte_ausente");
  if (story.documentoPrimarioNecessario === true && !story.documentoPrimario) issues.push("documento_primario_ausente");
  if (!story.dataPublicacao) issues.push("data_publicacao_ausente");
  if (!story.dataAtualizacao) issues.push("data_atualizacao_ausente");
  if (story.noindex === true) issues.push("noindex_indevido");
  if (!story.canonical || !absoluteHttpUrl(story.canonical)) issues.push("canonical_invalido");
  const paths = knownInternalPaths ? new Set(knownInternalPaths) : null;
  if (paths) {
    for (const link of story.linksInternos || []) {
      const href = typeof link === "string" ? link : link?.href;
      if (String(href || "").startsWith("/") && !paths.has(href)) issues.push(`link_interno_quebrado:${href}`);
    }
  }
  const schema = buildNewsArticleSchema({ story, canonical: story.canonical });
  if (!validateJsonLdSchema(schema).valid) issues.push("schema_invalido");
  return { valid: issues.length === 0, issues };
}

export function buildNewsArticleSchema({ story = {}, canonical, publisher = "Pauteiro" } = {}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: story.tituloEditorial,
    description: story.metadescricao || story.linhaFina,
    datePublished: story.dataPublicacao,
    dateModified: story.dataAtualizacao || story.dataPublicacao,
    mainEntityOfPage: canonical,
    author: { "@type": "Organization", name: story.autor || publisher },
    publisher: { "@type": "Organization", name: publisher }
  };
  if (story.imagem?.url) schema.image = [story.imagem.url];
  if (story.fontes?.length) schema.citation = story.fontes.map((source) => source.url).filter(absoluteHttpUrl);
  return schema;
}

export function buildBreadcrumbSchema(items = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}
