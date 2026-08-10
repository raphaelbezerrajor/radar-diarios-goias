# Curadoria editorial do Pauteiro

O documento oficial continua sendo publicado como registro factual. A promoção
para matéria jornalística depende de uma segunda camada: seleção por
valor-notícia e diretriz factual do ChatGPT. Como o painel editorial é de uso
individual, não existe uma aprovação redundante para a curadoria comum.

## Fluxo

1. A coleta preserva o ato, a edição, as páginas, os valores, os nomes, os
   identificadores e o endereço oficial.
2. `pnpm editorial:queue` seleciona os candidatos de maior interesse público e
   grava `data/editorial/curation-queue.json`.
3. O ChatGPT lê somente os candidatos com `status: "pending"`, confere o pacote
   factual e, quando necessário, as páginas indicadas no PDF.
4. A resposta é gravada em `data/editorial/curated-briefs.json` como `draft` e
   passa a orientar título e olho na próxima geração do portal.
5. Casos com conflito de valores, mistura de atos, sanção, responsabilização ou
   risco reputacional recebem `needs_review` e não alteram a publicação até que
   a pendência factual seja resolvida.

## Diretriz para o ChatGPT

Para cada candidato, produza uma pauta jornalística estruturada. Não escreva
como assessoria, não repita a linguagem do ato e não presuma irregularidade.
Separe rigorosamente:

- fatos confirmados no documento;
- contexto que ainda precisa ser localizado;
- hipóteses e perguntas de apuração;
- pessoas ou órgãos que precisam ser ouvidos;
- cruzamentos de dados recomendados;
- limites do que não pode ser afirmado;
- proposta de título, olho, lead e estrutura da matéria.

Contrato não significa pagamento. Valor estimado, contratado, empenhado,
liquidado e pago são estágios diferentes. Multa proposta não é multa
confirmada; abertura de defesa não é condenação. Quando houver crítica,
responsabilização, sanção, pessoa identificada ou impacto reputacional, marque
`mandatoryHumanReview: true` e inclua o contraditório necessário.

## Contrato do brief

Cada item de `briefs` deve ter:

```json
{
  "id": "mesmo id do candidato",
  "status": "draft",
  "promptVersion": "pauteiro-curadoria-v1",
  "model": "ChatGPT",
  "createdAt": "data ISO",
  "source": {
    "documentSha256": "hash do pacote factual",
    "documentReference": "edição e páginas"
  },
  "editorial": {
    "mainAngle": "ângulo central em linguagem direta",
    "whyItMatters": "efeito concreto para o leitor",
    "headlineOptions": ["opção 1", "opção 2", "opção 3"],
    "leadDirection": "o que o primeiro parágrafo precisa responder",
    "storyStructure": ["bloco 1", "bloco 2", "bloco 3"],
    "verifiedFacts": ["fato documental"],
    "contextToFind": ["contexto ausente"],
    "reportingQuestions": ["pergunta de apuração"],
    "peopleToHear": ["órgão, empresa ou pessoa"],
    "dataCrossChecks": ["base e cruzamento recomendado"],
    "doNotState": ["inferência vedada"],
    "publication": {
      "title": "",
      "deck": "",
      "paragraphs": []
    }
  },
  "humanReview": {
    "approvedBy": null,
    "approvedAt": null,
    "notes": ""
  }
}
```

Enquanto o brief for `draft`, os campos de `publication` podem ficar vazios. O
portal usa a primeira opção de título, o ângulo principal como olho e preserva
os parágrafos factuais já extraídos. Se houver título, olho e texto completos no
bloco `publication`, eles prevalecem. `needs_review` continua bloqueado até a
correção da pendência; o status `approved` permanece apenas por compatibilidade
com briefs antigos e não é mais necessário.
