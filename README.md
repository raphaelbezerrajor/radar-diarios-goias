# Pauteiro

Plataforma editorial modular para coleta, análise documental, radar de pautas e bases municipais. O Painel Diário é o módulo público de cobertura; Trindade é a primeira base municipal integrada.

## O que entrou nesta fase

- capa editorial responsiva, desenhada primeiro para celular;
- rotas separadas para `Plataforma`, `Painel Diário`, `Trindade` e `Busca`;
- busca publica por assunto, cidade, ano, tipo e frente de origem, com carga por ano para ficar mais leve no celular;
- detalhe estatico para cada pauta, noticia ou registro integrado;
- integracao do painel estadual com a base publica de Trindade;
- apresentação dos 2.919 atos de Trindade como registros-notícia factuais, cada um com fonte e estado de triagem;
- exportacao TXT preservada em `downloads/pauteiro-2026-pautas.txt`;
- aliases legados (`pauteiro.html`, `radar-diarios-goias.html` e afins) mantidos por redirecionamento.

## Arquitetura

- `src/`: paginas Astro, layout, componentes e estilos.
- `src/lib/municipal/`: contrato `MunicipalDataProvider` e adaptador JSON de Trindade.
- `src/lib/editorial/`: fluxo editorial, trava de aprovação e validações de SEO.
- `scripts/build-site-data.mjs`: consolida o painel estadual e consome Trindade pela camada municipal.
- `scripts/sync-trindade-data.mjs`: atualiza o snapshot municipal a partir de uma origem configurada, com baseline e hashes.
- `src/generated/`: saida gerada no build com resumo do site e registros detalhados.
- `public/data/site-search-manifest.json`: manifesto da busca com filtros e shards anuais.
- `public/data/search/year-*.json`: recortes anuais carregados sob demanda.
- `public/data/site-search.json`: carga completa, usada apenas quando a busca pede todos os anos.
- `data/trindade/`: espelho dos datasets publicos reaproveitados do portal local.
- `radar-diarios-goias-data.json`, `pauteiro-arquivo.js` e `pauteiro-cobertura.js`: continuam como camada de origem da cobertura estadual.

## Como rodar

```bash
pnpm install
TRINDADE_DATA_DIR=/caminho/para/Trindade-Aberta/data/public pnpm sync:trindade
pnpm test
pnpm build
pnpm validate
```

Publicacao atual:
[https://raphaelbezerrajor.github.io/radar-diarios-goias/](https://raphaelbezerrajor.github.io/radar-diarios-goias/)

## Base integrada

- painel estadual com pautas curadas de 2025 e 2026;
- escopo municipal aberto para os 246 municipios goianos;
- Trindade com atos do Diario, noticias verificadas e busca publica reaproveitada do outro projeto;
- 4.621 registros municipais integrados, incluindo 2.919 atos estruturados;
- recortes por DOE, MPGO, diarios proprios, AGM e DJE mapeado.

## Nota

O acervo segue em expansão editorial. A produção assistida gera apenas minutas e a publicação automática permanece desativada. Consulte `docs/AUDITORIA_INTEGRACAO.md` para riscos, limites de cobertura e plano de migração.
