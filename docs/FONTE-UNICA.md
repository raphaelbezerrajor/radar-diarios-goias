# Fonte única do Pauteiro

## Produto

Existe um único produto público: **Pauteiro**. Trindade, Goiânia, municípios, Governo de Goiás, ALEGO, TCM-GO e TCE-GO são editorias ou filtros do mesmo portal.

## Fluxo canônico

1. `apps/trindade-aberta/data/raw` preserva PDFs oficiais e hashes.
2. `apps/trindade-aberta/data/public` contém snapshots validados produzidos pelos coletores.
3. `apps/pauteiro/scripts/sync-trindade-data.mjs` promove apenas a lista permitida de snapshots.
4. `apps/pauteiro/scripts/build-site-data.mjs` deduplica, classifica e separa matéria de registro de acervo.
5. `apps/pauteiro` é o único destino de build e publicação.

## Regra de classificação

- **Matéria:** documento primário conferido, valor-notícia alto e texto com título ativo, lead, contexto, envolvidos, valores e limite factual.
- **Registro:** ato oficial pesquisável, com metadados e fonte, mas sem densidade ou interesse suficiente para ser apresentado como reportagem.
- **Revisão:** mistura de atos, números conflitantes, possível sanção ou risco reputacional ainda sem confirmação integral.

## Recorte editorial inicial

A reescrita estruturada cobre 2025 e 2026. Os anos anteriores continuam no acervo e podem receber tratamento editorial quando forem recuperados por uma apuração ou cruzamento de dados.

## Sistemas aposentados

O aplicativo antes chamado `monitor-diarios-goias` ou “Memória Oficial” não é uma terceira base operacional. Seu repositório foi arquivado de forma recuperável e saiu da pasta `apps`.
