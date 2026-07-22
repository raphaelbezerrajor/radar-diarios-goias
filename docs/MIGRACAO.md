# Migração progressiva para o Pauteiro

## Etapa 0 — baseline

- preservar os dois repositórios e URLs públicas;
- registrar hashes e contagens atuais;
- não usar os derivados zerados da coleta incompleta;
- confirmar build e testes antes e depois de cada etapa.

## Etapa 1 — camada municipal

- criar `MunicipalDataProvider`;
- implementar o adaptador JSON de Trindade;
- criar testes de contrato e contagens;
- fazer o build Astro consumir o provedor;
- tornar a origem do snapshot configurável, sem caminho local fixo.

Critério de saída: a busca continua com 4.621 registros municipais, 2.919 atos e documentos de origem preservados.

## Etapa 2 — plataforma modular

- adotar a marca Pauteiro no shell;
- manter Painel Diário como módulo público do radar;
- expor os nove módulos da plataforma e o fluxo editorial;
- incluir Trindade em Bases municipais;
- manter a publicação desativada.

## Etapa 3 — domínio editorial

- implementar estados e transições;
- validar segurança editorial e SEO;
- registrar versões, trechos de IA e contraditório;
- persistir pautas e matérias em banco somente após definição de ambiente e migração.

## Etapa 4 — API ou pacote compartilhado

- versionar o contrato municipal;
- escolher pacote publicado ou API HTTP conforme operação;
- migrar gradualmente as páginas do Trindade Aberta;
- eliminar imports diretos de JSON somente após testes de equivalência.

## Etapa 5 — novos municípios

- adicionar catálogo de provedores;
- criar testes comuns de contrato;
- exigir fonte, cobertura, baseline e proveniência;
- não reutilizar regras específicas de Trindade como regras universais.

## Etapa futura — publicação

Fora do escopo atual. Quando autorizada, deve ser um adaptador separado, exigir aprovação humana explícita, usar credenciais fora do código e registrar tentativa, resposta e versão publicada. Até lá, a interface permanece desativada.

## Rollback

- cada etapa deve ser um commit isolado;
- dados sincronizados são snapshots, não a fonte canônica;
- falha de validação impede substituição do snapshot;
- o Trindade Aberta continua publicável de forma independente;
- URLs legadas permanecem disponíveis até haver redirecionamento testado.

