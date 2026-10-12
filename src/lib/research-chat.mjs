const workspacePath = "D:\\Pauteiro";

export function buildResearchPrompt(record, pageUrl) {
  const lines = [
    "Quero aprofundar esta pauta do Pauteiro com documentos públicos primários. Não use a matéria como prova suficiente: confira o ato original e diferencie fatos comprovados, inferências e lacunas.",
    `Matéria: ${record.title}`,
    `Página: ${pageUrl}`,
    record.documentReference ? `Referência do ato: ${record.documentReference}` : null,
    record.sourceUrl ? `Documento oficial: ${record.sourceUrl}` : null,
    record.sourceHash ? `SHA-256 do PDF preservado: ${record.sourceHash}` : null,
    "Pesquise documentos comparáveis, cite links e páginas, confira período e unidade dos valores e mostre o que ainda precisa de apuração. Não confunda saldo de incentivo com renúncia realizada ou repasse, nem contrato com pagamento. Antes de concluir, proponha perguntas para o órgão e para os envolvidos."
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildResearchChatUrl(record, pageUrl) {
  const params = new URLSearchParams({
    path: workspacePath,
    prompt: buildResearchPrompt(record, pageUrl)
  });
  return `codex://new?${params.toString()}`;
}
