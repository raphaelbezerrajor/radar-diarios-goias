# Arquitetura do Pauteiro

## Decisão

O Pauteiro será uma plataforma modular federada, não um monorepo nesta etapa. O radar estadual continua no repositório Astro; o Trindade Aberta continua no repositório municipal e fornece snapshots públicos validados.

## Módulos

1. **Coleta** — cadastro de fontes, execução de coletores, retentativas e registro de coleta.
2. **Processamento documental** — preservação do original, hash, extração, OCR, normalização e classificação.
3. **Radar de pautas** — comparação histórica, sinais de relevância e criação de `StoryLead`.
4. **Apuração** — hipóteses, perguntas, documentos, fontes e contraditório.
5. **Produção assistida** — geração de minuta com trechos de IA identificados.
6. **Edição e aprovação** — revisão humana, pendências, versões e decisão editorial.
7. **Bases municipais** — provedores independentes por município.
8. **Monitoramento** — cobertura, falhas, atrasos, regressões e qualidade.
9. **Publicação** — somente contrato futuro, desativado.

## Bases municipais

```text
Bases municipais
└── Trindade
    ├── Diário Oficial
    ├── Atos
    ├── Câmara
    ├── Orçamento
    ├── TCM-GO
    ├── Notícias
    ├── Busca
    └── Estado da base
```

## Camadas

```text
Interface Astro
    ↓
Casos de uso / domínio editorial
    ↓
MunicipalDataProvider + serviços de busca e SEO
    ↓
Adaptador JSON validado hoje
    ↓
API ou PostgreSQL no futuro
```

Coletores e processadores nunca são importados por componentes visuais. Dados brutos nunca são lidos por páginas. A interface conhece somente DTOs retornados pelos provedores.

## Contrato MunicipalDataProvider

Métodos mínimos:

- `listarEdicoes(filtros)`;
- `buscarAtos(filtros)`;
- `obterAto(id)`;
- `listarNoticias(filtros)`;
- `obterNoticia(idOuSlug)`;
- `listarProposicoes(filtros)`;
- `listarProcessosTCM(filtros)`;
- `obterEstadoDaBase()`;
- `buscarEntidades(consulta)`;
- `obterEntidade(id)`.

O adaptador pode oferecer métodos adicionais, como Câmara, orçamento e metadados, desde que não quebre o contrato mínimo.

## Proveniência obrigatória

Cada registro exposto deve conservar, quando disponível:

- identificador estável;
- fonte e órgão;
- município;
- URL ou referência do documento original;
- data de publicação;
- data de coleta;
- data de processamento;
- hash do documento ou snapshot;
- páginas e trechos de origem;
- versão do parser/classificador;
- nível de confiança;
- intervenções de IA.

## Sincronização entre projetos

1. O Trindade Aberta produz datasets públicos.
2. A validação municipal impede regressões de baseline.
3. O Pauteiro copia somente uma allowlist, por argumento ou variável de ambiente.
4. Hashes e contagens entram em um relatório de sincronização.
5. O build usa o provedor, não caminhos de arquivo espalhados.
6. Nenhuma sincronização altera os documentos originais.

## Publicação

O domínio pode preparar título, slug, metadados, imagem e corpo, mas o adaptador de publicação expõe somente estado `disabled`. Não há credenciais, chamadas a CMS, webhooks ou transição automática para publicado.

## Inclusão de outro município

1. criar um adaptador que implemente `MunicipalDataProvider`;
2. fornecer mapeamento de fontes e estado de cobertura;
3. criar fixtures e testes de contrato;
4. registrar o provedor no catálogo municipal;
5. adicionar a rota sem alterar o código de Trindade;
6. validar proveniência e baseline antes de publicar a navegação.

