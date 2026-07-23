# Fluxo ato a ato de Trindade

## Objetivo

Transformar cada ato estruturado em uma unidade editorial legível, pesquisável e auditável, sem confundir geração automática de registro com publicação jornalística aprovada.

O corpus estável atual possui 2.919 atos. A meta operacional é manter a relação `1 ato = 1 registro-notícia + 1 StoryLead`, permitindo agrupamentos posteriores quando vários atos formarem uma única pauta.

## Duas camadas

### Registro-notícia

Gerado de forma determinística a partir do ato estruturado. Deve conter:

- identificador e vínculo permanente com o ato;
- título factual;
- olho;
- resumo de um parágrafo ou nota curta quando o ato não justificar texto maior;
- data, órgão, unidade, tipo e referência;
- valores, CNPJs, pessoas e empresas já extraídos, sem inferir relações ausentes;
- página, edição e URL do documento original;
- nível de confiança e avisos de revisão;
- estado inicial `detectada`.

Essa camada pode ser exibida no arquivo e na busca como leitura do ato, mas não recebe o selo de matéria apurada.

### Notícia editada

Surge depois de triagem, apuração e revisão humana. Pode reunir um ou vários registros-notícia. Exige autoria, editor, fontes, documentos relacionados, histórico de versões, registro de assistência por IA e contraditório quando aplicável.

## Fluxo

1. Receber somente atos vindos do `MunicipalDataProvider`.
2. Deduplicar por identificador, URL e hash do documento.
3. Preservar a fonte e os campos originais.
4. Gerar título, olho e nota factual sem acrescentar informação externa.
5. Classificar relevância, urgência e risco editorial.
6. Criar `StoryLead` no estado `detectada`.
7. Marcar revisão humana obrigatória para conteúdo sensível.
8. Permitir agrupamento por contrato, empresa, pessoa, órgão, assunto ou sequência temporal.
9. Mover somente itens selecionados para apuração e redação.
10. Manter a publicação automática desativada.

## Regras de linguagem

- Use “publicou”, “registrou”, “autorizou”, “designou”, “contratou” ou “abriu”, somente quando o verbo estiver sustentado pelo ato.
- Não trate valor contratado como pago.
- Não trate abertura de licitação como contratação concluída.
- Não trate requerimento ou projeto como política executada.
- Não conclua irregularidade a partir de alerta, multa, correção ou processo sem indicar o estágio e a autoridade responsável.
- Quando o resumo oficial for insuficiente, produza uma nota curta e encaminhe para revisão em vez de completar lacunas.

## Implementação atual

Os 2.919 atos estáveis já são consumidos pelo `MunicipalDataProvider` e apresentados no Pauteiro como registros-notícia individuais. Cada página usa título oficial, olho, resumo curto, edição, página, órgão, valor quando identificado e PDF original. O item mantém o estado `detectada · aguardando triagem` e não recebe schema de notícia apurada.

A etapa seguinte é persistir a promoção editorial na redação: agrupamento de atos relacionados, apuração, autoria, editor, versões, contraditório e registro de trechos assistidos por IA.
