# Auditoria de integração — Pauteiro e Trindade Aberta

Data da auditoria: 22 de julho de 2026  
Escopo: inspeção local, sem alteração de arquivos, dos projetos Pauteiro, Trindade Aberta e da versão pública municipal.

## Resumo executivo

O Pauteiro e o Trindade Aberta são projetos independentes, com stacks e formas de publicação diferentes. A integração de menor risco é progressiva: manter os dois repositórios, criar um contrato estável de dados municipais no Pauteiro e sincronizar somente datasets públicos validados. Não é recomendável formar um monorepo agora.

- O **Pauteiro** é um site estático Astro publicado no GitHub Pages. Ele já agrega o radar estadual e uma cópia controlada de dez datasets de Trindade.
- O **Trindade Aberta** é uma aplicação React/Next compatível com vinext e Cloudflare Workers, publicada por Sites. Usa D1 para conteúdo editorial, comentários e índice de busca, e R2 para mídia.
- A raiz municipal canônica mais completa é `D:\Trindade-Aberta`.
- A pasta `C:\Users\Raphael Bonitão\Documents\Codex\2026-07-19\https-piracanjuba-ai-2` é uma cópia anterior do mesmo projeto, dois commits atrás, com muitos resíduos ignorados de empacotamentos Sites. Ela não deve ser usada como fonte principal.
- A raiz do Pauteiro é `C:\Users\Raphael Bonitão\Documents\Codex\2026-07-22\oi-monta-o-link-p-blico\repo`.
- A versão pública do Trindade Aberta não foi tratada como código-fonte. Ela foi usada apenas para verificar disponibilidade e diferenças de estado hospedado.

## 1. Estrutura atual do Pauteiro

### Tecnologia e execução

- Astro 5, JavaScript/ESM e componentes `.astro`.
- pnpm 10.15.1, declarado em `packageManager`.
- Saída estática com base `/radar-diarios-goias`.
- Build: `pnpm build`.
- Validação: `pnpm validate`.
- Deploy: GitHub Actions e GitHub Pages, em push para `main`.
- Não há banco, API de aplicação ou autenticação no Pauteiro atual.
- Não há coleta agendada por cron. O único workflow faz build, validação e deploy.

### Rotas Astro

- `/`: capa do Painel Diário.
- `/goias/`: cobertura estadual.
- `/trindade/`: edição municipal resumida.
- `/busca/`: busca estática por shards anuais.
- `/base/[id]/`: páginas estáticas de registros.

### Componentes e domínio atual

- `src/layouts/BaseLayout.astro`: shell, navegação, metadados e rodapé.
- `src/components/MetricStrip.astro`, `SectionHeader.astro` e `StoryCard.astro`: apresentação.
- `scripts/build-site-data.mjs`: concentra leitura, normalização, classificação, composição editorial e geração dos arquivos públicos. É o principal ponto de acoplamento entre dados e apresentação.
- `scripts/sync-trindade-data.mjs`: copia uma lista permitida de datasets municipais.
- `scripts/validate-site.mjs`: valida contagens, identidade, páginas principais e tamanho do shard padrão.

### Dados e estrutura histórica

O repositório preserva duas gerações do projeto:

1. arquivos legados na raiz, como `index.html`, `pauteiro.html`, `radar-diarios-goias.html`, `radar-diarios-goias-data.json`, scripts PowerShell e servidor estático;
2. aplicação Astro atual em `src/`, com saída gerada em `src/generated`, `public/data` e `dist`.

Equivalentes históricos encontrados:

- `arquivo/2024`, `arquivo/2025` e `arquivo/2026`, separados por fonte;
- `pauteiro-arquivo.js` e `pauteiro-cobertura.js`;
- `build-pauteiro-arquivo.ps1`, `build-pauteiro-cobertura.ps1` e `generate-radar-goias.ps1`;
- `serve-static.js` e `serve-static.ps1`;
- arquivos `radar-diarios-goias-*`.

Não foram encontrados, com esses nomes, `radar-dataset.json`, `radar-dataset.js`, `por-data`, `por-municipio`, `prints`, `tools`, `build-radar-dataset.mjs` ou `start-local-site.ps1`.

Há uma pasta temporária ignorada `.preview-root-4321`, além de `dist`, `src/generated` e `node_modules`. Esses itens não fazem parte da fonte versionada.

## 2. Estrutura atual do Trindade Aberta

### Tecnologia e execução

- TypeScript, React 19, Next 16 e vinext sobre Vite 8.
- pnpm é o gerenciador operacional, mas o repositório contém `pnpm-lock.yaml` e `package-lock.json`. Isso aumenta o risco de instalações divergentes.
- Cloudflare Worker como entrada de produção.
- D1, binding `DB`, para notícias, fontes, revisões, comentários, índice de busca e perfis de empresas.
- R2, binding `MEDIA`, para arquivos de mídia.
- Drizzle ORM e migrações SQLite/D1.
- Build: `pnpm build` (`vinext build`).
- Deploy: Sites, descrito em `.openai/hosting.json`.
- Não há tarefas agendadas versionadas. As coletas são scripts manuais.

### Rotas de páginas

- `/`, `/noticias`, `/busca`, `/diario-oficial`, `/atos`;
- `/camara`, `/camara/legislativo`, `/orcamento`, `/tcm-go`;
- `/empresas/[cnpj]`, `/qualidade`;
- `/redacao` e `/redacao/comentarios`, protegidas por usuário editor.

### APIs

- busca pública;
- notícias públicas;
- envio de comentários;
- CRUD editorial, importação legada e mídia;
- moderação de comentários;
- proxy de mídia.

### Coletores e processamento

Há coletores e processadores para:

- Diário Oficial/AGM, descoberta histórica, download, extração, enriquecimento e amostragem;
- Câmara: contratos, contabilidade, execução orçamentária e proposições;
- TCM-GO: coleta, processamento, classificação, dossiês e fila de revisão;
- construção de notícias, índice investigativo, busca pública e banco SQLite/D1;
- validação de dados publicados.

Os scripts usam Node.js e Python. `requirements-data.txt` registra dependências Python de dados. As fontes ficam em `data/sources`; dados brutos e artefatos intermediários têm diretórios próprios, em grande parte ignorados pelo Git.

### Datasets públicos válidos encontrados

Na base estável atual:

- 2.066 edições do Diário catalogadas entre 19/07/2018 e 19/07/2026;
- 2.919 atos pesquisáveis no recorte estruturado de aproximadamente um ano;
- 822 menções de compras e contratações;
- 88 contratos da Câmara;
- 455 proposições legislativas, concentradas em 2026;
- 1.097 decisões brutas do TCM-GO e 445 processos com vínculo confirmado;
- 51 processos do TCM-GO aguardando revisão;
- 551 perfis de empresas por CNPJ;
- 12 notícias verificadas;
- 4.621 registros no índice municipal unificado.

### Persistência não presente no repositório

O conteúdo real de D1 e R2 não está no Git. Portanto, rascunhos editoriais, revisões, comentários recebidos, mídias enviadas e o estado do índice importado existem apenas no ambiente hospedado ou na emulação local. A API pública de notícias respondeu sem itens durante a auditoria; as notícias verificadas da página são provenientes do dataset JSON legado.

## 3. Comparação com a versão publicada

Foram verificadas com resposta HTTP 200 as rotas públicas `/`, `/noticias`, `/busca`, `/diario-oficial`, `/atos`, `/camara`, `/camara/legislativo`, `/orcamento`, `/tcm-go` e `/qualidade`. A rota `/redacao` respondeu 403 sem autenticação, conforme esperado.

Todas essas áreas têm código-fonte correspondente em `D:\Trindade-Aberta`. Não foi identificada página pública importante existente apenas no HTML publicado. As diferenças exclusivas da publicação são estado persistente de D1/R2, autenticação e configuração de infraestrutura.

## 4. Incompatibilidades e riscos

### Risco crítico: coleta incompleta na árvore local

Há alterações não versionadas em sete arquivos de dados do Trindade Aberta. Entre elas:

- `data/public/agm-trindade-acts.json` caiu de 2.919 atos no `HEAD` para zero;
- `data/public/agm-trindade-entities.json` caiu de 499 empresas para zero;
- o diff conjunto remove mais de 115 mil linhas.

Os índices estáveis usados pela aplicação — especialmente `agm-trindade-acts-search.json`, `agm-trindade-acts-enriched.json`, `company-profiles.json` e `unified-search-index.json` — continuam íntegros. Os arquivos regressivos não devem substituir a base publicada nem ser sincronizados para o Pauteiro.

### Outros riscos

- O script de sincronização do Pauteiro contém um caminho local padrão para `D:\Trindade-Aberta`; isso não é portátil.
- O Pauteiro mistura normalização de domínio, composição editorial e escrita de saída em um único script.
- Páginas do Trindade Aberta importam JSON diretamente; não existe ainda um provedor municipal estável.
- Há duas cópias locais do Trindade Aberta com o mesmo remoto; a cópia no disco D está dois commits à frente.
- O Trindade Aberta mantém dois lockfiles e não declara `packageManager`.
- O modelo editorial legado municipal possui estados `scheduled` e `published`. Ele será preservado por compatibilidade, mas não será adotado pelo novo domínio do Pauteiro.
- O Pauteiro carrega arquivos legados e a aplicação Astro lado a lado; removê-los agora poderia quebrar URLs ou processos ainda usados.
- Há URLs e rastros locais em alguns datasets de análise. A interface pública deve aceitar apenas URLs HTTP(S) ou rotas públicas conhecidas.
- Não há automação versionada para coleta, retentativa, observabilidade ou alerta de falha.
- A cobertura não é homogênea: oito anos de inventário de edições não significam oito anos de atos estruturados.

## 5. Segredos e variáveis de ambiente

Não foi encontrado segredo versionado pelos padrões auditados. O Trindade Aberta possui somente `.env.example`, com valores ilustrativos. O arquivo `.gitignore` exclui `.env*`.

Variáveis documentadas:

- `DATABASE_URL`;
- `OBJECT_STORAGE_BUCKET`;
- `COLLECTOR_USER_AGENT`;
- `COLLECTOR_TIMEOUT_MS`;
- `TRINDADE_DATA_DIR`, usada pelo sincronizador do Pauteiro.

Bindings hospedados `DB` e `MEDIA` são geridos pelo Sites, não por credenciais no código.

## 6. Arquivos que não devem ser alterados nesta etapa

- os sete datasets não versionados da coleta incompleta;
- `data/raw`, documentos originais, hashes e diretórios de snapshots;
- migrações Drizzle já publicadas;
- `.openai/hosting.json` e bindings existentes;
- autenticação editorial do Trindade Aberta;
- arquivos legados do Pauteiro e URLs públicas existentes;
- conteúdo editorial, números, datas e fontes dos datasets.

## 7. Funcionalidades incompletas

- oito anos de atos estruturados; há oito anos de inventário, mas cerca de um ano de leitura ato a ato;
- quadro societário de empresas;
- peças orçamentárias ainda marcadas como lacunas;
- cobertura legislativa histórica anterior a 2026;
- revisão de 51 processos TCM;
- fluxo editorial do Pauteiro com persistência, responsáveis e histórico;
- coleta agendada e monitoramento operacional;
- API municipal versionada;
- publicação automática, deliberadamente fora do escopo.

## 8. Proposta de arquitetura

Adotar uma federação progressiva de dois projetos:

1. Trindade Aberta continua sendo a fonte municipal canônica, com coletores, dados brutos, processamento, D1/R2 e site público preservados.
2. Pauteiro recebe snapshots públicos allowlisted e validados.
3. Um `MunicipalDataProvider` isola as páginas e o build da estrutura física dos JSONs.
4. O contrato mantém proveniência, datas de coleta/processamento e referências ao documento original.
5. O domínio editorial do Pauteiro é independente do modelo de publicação legado municipal.
6. A interface de publicação futura permanece desativada e sem integração com WordPress ou CMS.

Detalhes em `docs/ARQUITETURA.md`, `docs/MODELO_DE_DADOS.md` e `docs/MIGRACAO.md`.

## 9. Motivo provável da tentativa anterior ter falhado

A integração anterior copiou datasets e criou links entre os sites, mas não criou uma fronteira de domínio. O script de build do Pauteiro conhece nomes e formatos de cada JSON; as páginas municipais também importam arquivos diretamente. Isso funciona enquanto os arquivos permanecem idênticos, mas falha quando uma coleta parcial zera ou altera um derivado, quando o caminho local não existe, ou quando a persistência D1/R2 não está disponível. A ausência de um contrato, validação de baseline e separação entre inventário e leitura estruturada tornou a integração frágil.

## 10. Plano de migração por etapas

1. Criar e testar `MunicipalDataProvider` no Pauteiro.
2. Remover o caminho local fixo do sincronizador e ampliar a allowlist apenas com datasets estáveis.
3. Fazer o build atual consumir o provedor sem alterar números ou URLs públicas.
4. Expor o módulo Trindade dentro da navegação Pauteiro.
5. Introduzir domínio editorial, validações de SEO e barreiras de aprovação humana sem publicar.
6. Testar os dois builds e as rotas públicas.
7. Em etapa posterior, criar um pacote compartilhado versionado ou API municipal, migrar gradualmente as páginas do Trindade Aberta e só então avaliar banco PostgreSQL.

## 11. Verificação após a implementação controlada

A primeira etapa da migração foi concluída sem modificar a raiz canônica do Trindade Aberta:

- `MunicipalDataProvider` criado e coberto por testes;
- build do Pauteiro desacoplado dos nomes físicos dos JSONs municipais;
- caminho local fixo removido do sincronizador;
- snapshot ampliado para vinte datasets municipais públicos, com allowlist, baselines e hashes;
- módulo Trindade exposto na navegação do Pauteiro;
- domínio editorial e validações de SEO adicionados sem adaptador de publicação;
- acervo já publicado reapresentado sem alterar fatos, números, datas ou fontes;
- Pauteiro: 9 testes unitários, build de 4.679 páginas e validação de contagens aprovados;
- Trindade Aberta: build de produção e 14 testes de HTML aprovados.

O lint do Trindade Aberta ainda falha com 31 erros e 7 avisos preexistentes. Os grupos principais são links internos feitos com `<a>` em vez de `Link`, atualizações síncronas de estado em efeitos React e avisos de imagens. Como o repositório municipal contém uma coleta não versionada e regressiva em andamento, esses componentes não foram reescritos nesta etapa. A dívida deve ser tratada em um commit próprio, com nova verificação de interface e sem misturar correção de componentes com regeneração de dados.
