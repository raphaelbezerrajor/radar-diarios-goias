# Curadoria editorial do Pauteiro

As pautas extraídas automaticamente que chegaram a aparecer como matérias ficam na redação. O catálogo interno preserva o original, a referência e a identificação de cada ato. A busca pública e as páginas do site só recebem a matéria quando há texto próprio publicado pela redação.

## Fluxo

1. A coleta preserva o ato, a edição, as páginas, os valores, os nomes, os
   identificadores e o endereço oficial.
2. Após gerar o catálogo, `pnpm editorial:queue` atualiza `curation-queue.json` em `PAUTEIRO_PRIVATE_DIR` (na operação local, `D:\Pauteiro\private\editorial`). A fila reúne a seleção diária e todas as pautas retiradas do site.
3. Quando a redação pedir para começar a apuração, leia os IDs de `nextBatch` nessa ordem e localize as fichas em `candidates`. O lote considera decisões de controle, efeitos em serviços, mudanças concretas, valores e qualidade da referência. Confira o ato, o estágio, a data do fato e eventual cobertura anterior. Registre o andamento em `triagens` para que o trabalho não volte a ser encaminhado. Os demais candidatos permanecem disponíveis para decisão editorial.
4. Redija a matéria a partir do que foi confirmado. Rascunhos e pendências ficam no fluxo privado. A publicação usa a aprovação editorial existente, a escolha de editoria e o destino definidos na redação.
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

Enquanto o brief for `draft`, os campos de `publication` podem ficar vazios. O material segue privado em `needs_review`. Para promover o ato via curadoria, aprove o brief com fonte conferida e bloco de publicação completo e marque `promoteToStory`. A mesa de edição também permite escrever uma matéria própria a partir da ficha.
