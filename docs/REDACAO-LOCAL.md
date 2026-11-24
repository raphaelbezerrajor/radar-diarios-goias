# Redação local do Pauteiro

A redação roda somente neste computador, em `127.0.0.1`. Não há uma rota de edição no GitHub Pages nem credencial de escrita no navegador.

## Abrir

Na pasta `D:\Pauteiro\apps\pauteiro`:

```powershell
pnpm redacao:local
```

Abra `http://127.0.0.1:4317/redacao/`. O servidor também apresenta a versão local do site em `http://127.0.0.1:4317/radar-diarios-goias/`. Mantenha o comando aberto enquanto edita.

## Fluxo

1. Escolha uma matéria existente pelo título ou cidade, ou clique em **Nova**.
2. Confira o PDF ou ato oficial. Para matérias existentes, a identidade da fonte fica bloqueada na edição.
3. Escolha a editoria e o destino. **Capa e editoria** inclui a matéria na capa do ano corrente e na página temática. **Somente na editoria** publica a chamada na página temática. **Apenas como leitura relacionada** exige selecionar a matéria que receberá o link em **Leia também**. Todos os destinos preservam a página da matéria e a consulta pelo acervo. Matérias anteriores à classificação mantêm seus endereços e podem ser distribuídas pelo editor.
   Para mudar apenas essas escolhas em matéria existente, use **Aplicar somente a distribuição**. Para editar o conteúdo, escreva título, olho e texto em parágrafos. **Salvar rascunho** guarda o trabalho no computador.
4. **Aplicar ao site local** executa testes, gera o site e valida a base. Se algo falhar, a alteração editorial é revertida.
5. Confira a matéria na prévia local. O site público continua igual até uma publicação separada do repositório.

## Onde fica cada coisa

- Rascunhos: `D:\Pauteiro\work\pauteiro-editorial-drafts.json`. Não entram no repositório público.
- As escolhas aplicadas ficam em `D:\Pauteiro\private\editorial\story-overrides.json`. A exportação grava em `data/editorial/story-overrides.json` os textos aprovados e os vínculos públicos de distribuição.
- Notícias, atos e fontes coletados: permanecem em `apps/trindade-aberta` e nos snapshots sincronizados.
- Página local: `dist`, regenerada pelo processo editorial.

O editor altera o texto e os metadados editoriais; não altera o PDF nem o ato original. Uma matéria nova exige cidade, data, órgão, URL HTTPS do documento e referência de edição/página. A redação não faz upload de imagem nesta primeira etapa.

## Segurança e publicação

O servidor aceita conexões apenas em `127.0.0.1`, verifica o cabeçalho `Host` e exige origem local e token de sessão para gravações. Não usa senha ou token do GitHub. Outros programas no mesmo computador ainda podem alcançar a porta local; feche o comando após editar. Enviar a versão aprovada ao site público continua sendo um passo editorial separado.
