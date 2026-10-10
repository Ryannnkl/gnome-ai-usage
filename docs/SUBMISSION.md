# Submissão ao extensions.gnome.org

## Pacote

Execute `npm run pack` na raiz do projeto. Envie somente
`dist/ai-usage@ryannnkl.com.shell-extension.zip` pela página de upload.
Leia os termos e marque as confirmações apenas se concordar com eles.
O envio não implica aprovação: o pacote passa pela revisão do GNOME.

O ZIP contém os módulos usados por `extension.js` e `prefs.js`, estilos,
ícone, traduções compiladas, schema, `metadata.json`, `LICENSE` e `COPYRIGHT`.
Não inclui Python, executáveis, testes, scripts de build, documentação,
capturas de tela ou módulos antigos de histórico não usados no runtime.

## Dependências externas

GJS e Soup 3 são usados no Shell; GTK 4/libadwaita nas preferências.
Codex usa credenciais locais em modo somente leitura e uma consulta HTTPS de cota.
Claude Code e Antigravity usam seus CLIs existentes para consultar `/usage`.
A extensão não instala dependências, não modifica credenciais e não exige privilégios.

O histórico Codex/Claude é coletado em GJS, por leitura assíncrona de JSONL.
Para Antigravity, GJS interpreta os metadados protobuf de uso; `sqlite3`
consulta apenas `steps.metadata` e `gen_metadata.data`, com `-readonly -json`.
Essa dependência existe porque não há uma API SQLite no conjunto de bibliotecas
usado pela extensão. A alternativa anterior exigia scripts Python distribuídos.
Os argumentos são passados diretamente ao subprocesso, sem shell intermediário.
As consultas são paginadas, têm prazo de cancelamento e o subprocesso é encerrado
quando a requisição é cancelada, inclusive na desativação da extensão.
Sem `sqlite3`, as cotas e os históricos Codex/Claude continuam funcionando.
O uso de subprocessos está sujeito à avaliação do revisor.

## Validação local

```bash
npm test
npm run check
npm run test:gjs
npm run test:prefs
npm run test:shell
npm run pack
shexli --format json dist/ai-usage@ryannnkl.com.shell-extension.zip
```

O teste GJS de SQLite usa uma base sintética e verifica que a coleta não altera
seu conteúdo. Testes normais não acessam contas reais.
O teste Shell valida o pacote no DevKit, sem instalá-lo na sessão principal.

Na validação de 10/10/2026, Shexli 0.2.1 do espelho GNOME/extensions-web
reportou somente `EGO-M-004`: a regra `metadata.py` usa o limite fixo
`major > 50`. O projeto foi testado no GNOME Shell 51.0 e mantém somente `51`
em `shell-version`. Não declarar suporte ao GNOME 50 sem testá-lo.
Esse resultado não substitui a revisão do site nem garante aceitação.

## Nota para o revisor

> AI Usage displays subscription quotas and seven days of local token counts.
> All bundled runtime code is GJS/JavaScript, licensed GPL-2.0-or-later.
> Claude Code and Antigravity quotas are queried through their existing CLIs.
> Antigravity token metadata requires the system sqlite3 command in read-only
> mode; only metadata columns are queried, without a shell intermediary.
> No executables or Python scripts are bundled, dependencies are not installed,
> and missing sqlite3 does not prevent quota queries or other token histories.
> Requests are cancellable; disabling cancels reads and terminates subprocesses.
> Token histories describe local clients, not complete account-wide usage.
> Tested with GNOME Shell 51.0 in Shell DevKit.

As capturas em `docs/images/` usam dados de demonstração e podem ser adicionadas
à página da extensão, separadamente do ZIP.
