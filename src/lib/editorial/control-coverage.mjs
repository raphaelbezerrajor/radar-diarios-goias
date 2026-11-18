const provenance = item => [item.source_id, item.sourceFamily, item.source_name, item.sourceLabel, item.source_label].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const courtId = item => /\btcmgo\b|\btcm-go\b/.test(provenance(item)) ? 'tcmgo' : /\btcego\b|\btce-go\b/.test(provenance(item)) ? 'tcego' : null;
export const isAlego = item => /\balego\b|assembleia legislativa/.test(provenance(item));
export const recentFirst = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || Number(b.importance || 0) - Number(a.importance || 0) || String(a.id).localeCompare(String(b.id));

export function courtRecordText(item) {
  const label = courtId(item) === 'tcmgo' ? 'TCM-GO' : 'TCE-GO';
  const title = `${label}: ${item.official_title || 'registro do diário'}`;
  const deck = `Registro do diário, edição ${item.edition_number || 'não informada'}, página ${item.page_start || 'não informada'}.`;
  const excerpt = String(item.evidence_excerpt || '').trim();
  return {title,deck,summary:[deck,excerpt].filter(Boolean).join(' '),paragraphs:[deck,...(excerpt?['Trecho do documento: '+excerpt]:[])]};
}

// Explicit public projection: paths, collection errors and editorial notes stay internal.
export function buildControlCoverage(manifests, records = []) {
  return ['tcmgo', 'tcego'].map(id => {
    const source = manifests.flatMap(m => m.sources || []).find(s => s.id === id);
    const editions = (source?.editions || []).filter(e => e.download_status === 'download_success' && e.validation_status === 'valid_pdf').sort(recentFirst);
    const latest = editions[0];
    return {
      id, label: id === 'tcmgo' ? 'TCM-GO' : 'TCE-GO',
      scope: id === 'tcmgo' ? 'Contas dos municípios' : 'Contas do Estado',
      officialUrl: id === 'tcmgo' ? 'https://www.tcmgo.tc.br/doc/index.jsf' : 'https://dec.tce.go.gov.br/',
      checkedAt: source?.checked_at || null,
      editions: editions.length,
      latest: latest ? { date: latest.date, number: latest.edition_number, url: /^https:\/\//.test(latest.file_url || '') ? latest.file_url : source.official_url } : null,
      recentRecords: records.filter(item => courtId(item) === id).sort(recentFirst).slice(0, 6)
    };
  });
}
