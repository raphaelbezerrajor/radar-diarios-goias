# Modelo de dados do Pauteiro

## Regras gerais

- IDs são estáveis e independentes do nome do arquivo.
- Datas usam ISO 8601.
- Valores monetários são armazenados em centavos ou decimal com moeda explícita.
- Documentos originais são imutáveis e identificados por hash.
- Toda transformação mantém proveniência e versão.
- Campos inferidos pela IA registram modelo/processo, confiança e trechos de apoio.

## Entidades

### Source

`id`, `nome`, `tipo`, `url`, `orgao`, `municipio`, `frequenciaColeta`, `ativo`, `ultimaColetaEm`.

### Document

`id`, `sourceId`, `urlOriginal`, `dataPublicacao`, `dataColeta`, `dataProcessamento`, `titulo`, `arquivo`, `hash`, `paginas`, `textoExtraido`, `mimeType`, `parserVersion`.

### PublicAct

`id`, `documentId`, `tipo`, `orgao`, `municipio`, `resumo`, `pessoas`, `empresas`, `cnpjs`, `valores`, `datas`, `referencias`, `paginas`, `nivelConfianca`, `classificadorVersion`.

### StoryLead

`id`, `tituloProvisorio`, `resumo`, `relevancia`, `urgencia`, `municipio`, `tema`, `entidades`, `documentosRelacionados`, `hipoteses`, `perguntasApuracao`, `status`, `criadoEm`, `atualizadoEm`.

### Story

`id`, `storyLeadId`, `tituloEditorial`, `tituloSeo`, `linhaFina`, `corpo`, `autor`, `editor`, `fontes`, `linksInternos`, `imagem`, `legenda`, `credito`, `metadescricao`, `slug`, `status`, `versao`, `historicoAlteracoes`, `trechosIa`, `canonical`, `noindex`.

### Entity

`id`, `tipo`, `nome`, `nomesAlternativos`, `municipio`, `documentos`, `atos`, `noticias`, `relacoes`, `identificadores`, `verificacaoStatus`.

### EditorialReview

`id`, `storyId`, `responsavel`, `status`, `observacoes`, `pendencias`, `aprovadoEm`, `contraditorio`, `revisaoHumanaObrigatoria`.

## Estados editoriais

Estados válidos:

- `detectada`;
- `triagem`;
- `em_apuracao`;
- `aguardando_resposta`;
- `pronta_para_redacao`;
- `em_redacao`;
- `em_edicao`;
- `pendencia_editorial`;
- `aprovada`;
- `arquivada`.

`publicada` não é um estado funcional do Pauteiro. Pode aparecer apenas em documentação de integração futura ou em dados legados do Trindade Aberta.

## Transições e segurança

Uma matéria não pode avançar para `aprovada` sem:

- fontes identificadas;
- documentos relacionados;
- autoria e editor;
- revisão editorial;
- histórico de versões;
- marcação de trechos gerados ou alterados por IA;
- contraditório registrado quando aplicável.

Acusações, investigações, crimes, contratos controversos e pessoas identificáveis exigem revisão humana obrigatória. O sistema retorna pendências; nunca aprova silenciosamente.

## Metadados de SEO

O DTO editorial prepara:

- título editorial e título SEO;
- linha fina;
- slug e metadescrição;
- canonical;
- Open Graph e Twitter Card;
- `NewsArticle` e `BreadcrumbList` em JSON-LD;
- autoria, publicação e atualização;
- imagem, texto alternativo, legenda e crédito;
- links internos e fontes documentais.

Validações mínimas: título, slug, metadescrição, exatamente um H1, autoria, fontes, documento primário quando necessário, imagem com alt e crédito, links internos válidos, schemas válidos e ausência de `noindex` indevido.

