# Fluxo ato a ato de Trindade

## Objetivo

Transformar cada ato oficial verificado em notícia legível, pesquisável e auditável. O Pauteiro é a linha publicada; o Trindade Aberta preserva documentos, coletores e dados municipais.

O corpus atual possui 2.919 atos estruturados. A regra é `1 ato = 1 matéria documental`, com possibilidade de uma reportagem posterior reunir vários atos relacionados.

## O que é publicado

Cada matéria documental contém:

- título jornalístico factual;
- olho;
- lead com órgão, ato e data;
- parágrafo de detalhamento com edição, página, referências, nomes e valores disponíveis;
- parágrafo de contexto que explica o estágio administrativo sem extrapolar o documento;
- data do ato separada da data de publicação no Pauteiro;
- URL do PDF original;
- imagem WebP da página usada como fonte, com hash do PDF e da imagem.

Reportagens já publicadas por prefeituras, tribunais, câmaras e assessorias não entram na coleta automática. A origem deve ser Diário Oficial, ato legislativo, decisão de tribunal de contas ou outro documento público primário.

## Linha do tempo e arquivo

A linha do tempo pública mostra somente o ano corrente. Em 2026, fatos de 2018 a 2025 permanecem no arquivo e na busca histórica; não aparecem misturados às últimas notícias.

## Fluxo diário

1. Consultar fontes oficiais.
2. Baixar e preservar os novos documentos.
3. Deduplicar por identificador, URL e hash.
4. Extrair e normalizar o texto.
5. Classificar município, órgão, tema e tipo.
6. Extrair nomes, empresas, CNPJs, valores, datas e referências.
7. Isolar a página usada como fonte e gerar WebP leve.
8. Produzir título, olho, lead, detalhamento e contexto.
9. Conferir os campos sensíveis contra a página original.
10. Publicar no Pauteiro e atualizar a busca.

## Regras de linguagem

- Contrato não equivale a pagamento.
- Abertura de licitação não equivale a contratação concluída.
- Proposição legislativa não equivale a política executada.
- Alerta, multa, correção ou processo deve indicar a decisão, o estágio e a autoridade responsável.
- Nomes, datas, números e valores devem permanecer iguais ao documento.
- Informação ausente não é completada por inferência.

## Implementação atual

Os 2.919 atos de Trindade e 445 dossiês confirmados do TCM-GO já geram páginas jornalísticas individuais. O filtro bloqueia notícias institucionais, a capa usa apenas fatos de 2026 e a busca preserva o acervo histórico.
