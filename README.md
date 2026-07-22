# Painel Diário

Base pública de atos e pautas para cobertura de Goiás, refeita em Astro e integrada ao acervo do Trindade Aberta.

## O que entrou nesta fase

- capa editorial responsiva, desenhada primeiro para celular;
- rotas separadas para `Goiás`, `Trindade` e `Busca`;
- busca publica por assunto, cidade, ano, tipo e frente de origem, com carga por ano para ficar mais leve no celular;
- detalhe estatico para cada pauta, noticia ou registro integrado;
- integracao do painel estadual com a base publica de Trindade;
- exportacao TXT preservada em `downloads/pauteiro-2026-pautas.txt`;
- aliases legados (`pauteiro.html`, `radar-diarios-goias.html` e afins) mantidos por redirecionamento.

## Arquitetura

- `src/`: paginas Astro, layout, componentes e estilos.
- `scripts/build-site-data.mjs`: consolida o painel estadual, os manifests anuais e os dados de Trindade em uma base unica.
- `scripts/sync-trindade-data.mjs`: atualiza o espelho municipal a partir da pasta principal no disco D.
- `src/generated/`: saida gerada no build com resumo do site e registros detalhados.
- `public/data/site-search-manifest.json`: manifesto da busca com filtros e shards anuais.
- `public/data/search/year-*.json`: recortes anuais carregados sob demanda.
- `public/data/site-search.json`: carga completa, usada apenas quando a busca pede todos os anos.
- `data/trindade/`: espelho dos datasets publicos reaproveitados do portal local.
- `radar-diarios-goias-data.json`, `pauteiro-arquivo.js` e `pauteiro-cobertura.js`: continuam como camada de origem da cobertura estadual.

## Como rodar

```bash
pnpm install
pnpm sync:trindade
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

O acervo segue em expansao editorial. A camada atual privilegia desempenho e legibilidade sem perder a trilha de origem, os marcadores e o recorte por fonte.
