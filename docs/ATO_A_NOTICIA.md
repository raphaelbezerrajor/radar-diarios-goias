# Fluxo ato a ato de Trindade

## Objetivo

Transformar documentos oficiais relevantes em notícias legíveis, pesquisáveis e auditáveis. O Pauteiro é a linha publicada; o Trindade Aberta preserva documentos, coletores e dados municipais.

O corpus atual possui 2.919 atos estruturados. A regra é `1 ato = 1 registro auditável`; somente atos com valor-notícia viram matéria. O repositório preserva o conjunto completo sem transformar volume burocrático em cobertura jornalística.

## O que é publicado como notícia

Entram no noticiário atos ligados a dinheiro público, contratos, licitações, orçamento, obras, serviços, direitos, mudanças estratégicas, decisões de controle, sanções, correções e efeitos concretos para a população. Diárias, férias, licenças, rotinas internas e atos sem consequência pública clara permanecem apenas no repositório.

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
8. Calcular e registrar o valor-notícia; separar rotina de interesse público.
9. Produzir título, olho, lead, detalhamento e contexto somente para o recorte relevante.
10. Conferir os campos sensíveis contra a página original.
11. Publicar notícias no Pauteiro e atualizar o repositório completo na busca.

## Regras de linguagem

- Contrato não equivale a pagamento.
- Abertura de licitação não equivale a contratação concluída.
- Proposição legislativa não equivale a política executada.
- Alerta, multa, correção ou processo deve indicar a decisão, o estágio e a autoridade responsável.
- Nomes, datas, números e valores devem permanecer iguais ao documento.
- Informação ausente não é completada por inferência.

## Implementação atual

Os 2.919 atos de Trindade e 445 dossiês confirmados do TCM-GO permanecem pesquisáveis. O filtro editorial promove somente o recorte de interesse público, bloqueia notícias institucionais e mantém a capa limitada aos fatos relevantes de 2026.
