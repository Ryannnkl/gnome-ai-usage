# AI Usage

Extensão para GNOME Shell 51 com um indicador fixo no painel e menu de cotas
de assinatura. Providers são opcionais e usam sessões locais já autenticadas.

**Versão:** 0.2.0 · **UUID:** `ai-usage@ryannnkl.com` · [ryannnkl.com](https://ryannnkl.com)

Monitore Codex, Claude Code e Antigravity com o tema nativo do GNOME, cotas de
cinco horas/semanais e um gráfico compacto dos tokens locais dos últimos sete dias.
Não é necessário colar chaves de API na extensão. Não há telemetria.

## Instalação

Requisitos: **GNOME Shell 51**, GJS, Soup 3 e Python 3 para o histórico de tokens.
Para abrir preferências, são necessários GTK 4 e libadwaita.
Os CLIs `codex`, `claude` e `agy` são opcionais: basta ter os que deseja monitorar,
com login feito nos aplicativos oficiais.

Para compilar o pacote, tenha Node.js, `glib-compile-schemas`, gettext e
`gnome-extensions` disponíveis:

```bash
git clone https://github.com/Ryannnkl/gnome-ai-usage.git
cd gnome-ai-usage
npm run pack
gnome-extensions install --force dist/ai-usage@ryannnkl.com.shell-extension.zip
```

Saia e entre novamente na sessão para o Shell reconhecer/carregar o pacote.
Depois, habilite a extensão e abra suas preferências se necessário:

```bash
gnome-extensions enable ai-usage@ryannnkl.com
gnome-extensions prefs ai-usage@ryannnkl.com
```

### Migrar da identidade antiga

Se você instalou a versão anterior com UUID `ai-usage@ryannnkl.dev`, desabilite-a
antes de habilitar a nova, para não manter dois indicadores e consultas duplicadas:

```bash
gnome-extensions disable ai-usage@ryannnkl.dev
```

Instale o novo pacote e siga os passos acima. O schema e o caminho GSettings foram
preservados, portanto as preferências continuam disponíveis. Não é necessário
apagar suas configurações, credenciais ou a instalação antiga para migrar.

## O que funciona

- Reutiliza `auth.json` do Codex em modo somente leitura.
- Detecta `CODEX_HOME` disponível no ambiente do Shell ou usa `~/.codex`.
  A configuração existente de diretório continua sendo respeitada.
- Consulta Claude Code pelo comando oficial `/usage` em modo print, sem criar
  transcrições nem ler metadata ou `.credentials.json`. O CLI recebe o mesmo
  `CLAUDE_CONFIG_DIR` resolvido pela extensão. `claude auth status` confirma a conta
  antes e depois de `/usage`; a confirmação usa somente o hash da identidade.
  Leituras de cota Claude não são persistidas entre consultas ou reinícios; se a
  consulta falhar, a leitura anterior também é descartada para evitar atribuição
  a uma conta que talvez tenha sido trocada.
- Consulta Antigravity pelo CLI oficial `agy --print /usage`; converte cotas
  restantes em uso para Gemini e modelos Claude/GPT, incluindo janelas de cinco
  horas e semanais.
- Preferências contêm apenas switches para Codex, Claude Code e Antigravity.
  Desabilitar cancela consultas em andamento e remove seus monitores e leituras
  do menu. Providers desabilitados não são detectados nem consultados; abrir o
  menu ou atualizar manualmente também não os acessa. Os switches começam ligados.
- Detecta cada provider habilitado independentemente no início da extensão. Codex aparece
  quando seu diretório existe, o CLI `codex` é encontrado ou há caminho explícito
  configurado; Claude e Antigravity dependem dos CLIs encontrados em `PATH`,
  `~/.local/bin` ou `~/.local/share/mise/shims`. Claude e Antigravity mantêm a sessão autenticada
  por seus próprios aplicativos; a extensão não inicia login, lê tokens para
  chamadas de rede nem implementa renovação de credenciais.
- Pode funcionar com qualquer combinação, inclusive sem providers. Nesse caso,
  o menu mostra “Nenhum provider disponível” e a ausência não bloqueia a UI.
  Um CLI encontrado mas sem login aparece individualmente como indisponível.
- Mostra percentual usado, duração da janela, plano e renovação informados
  pelo backend no menu. O painel mostra um anel proporcional ao maior consumo
  conhecido entre os providers habilitados, incluindo a janela semanal.
- O anel usa a cor de destaque do GNOME, atenuada em repouso, com transições
  de 350 ms entre valores. Respeita animações desabilitadas e movimento reduzido;
  não mantém animações contínuas. Um ponto central indica consulta em andamento,
  não atividade do agente. Leituras incertas usam trilha tracejada e marca central,
  sem representar ausência como consumo zero.
- O anel usa warning a partir de 75% e error a partir de 100% em qualquer janela,
  incluindo a semanal. Warning/error usam as cores semânticas do tema GNOME
  (laranja/vermelho no tema padrão), sem paleta própria ou cores fixas.
- O pior limite conhecido prevalece. Leituras ausentes, antigas, falhas e
  janelas vencidas aguardando confirmação têm estado distinto de repouso.
- O menu começa com resumos da janela principal por provider. Clique em uma
  linha para expandir detalhes individuais em um submenu nativo do GNOME:
  janelas adicionais, plano, renovação e idade/estado da leitura, sem repetir
  a janela principal já exibida no resumo. Consultas
  automáticas preservam a linha e o submenu aberto. Um alerta semanal aparece
  no resumo para explicar o estado global, sem exibir todas as métricas sempre.
- Resumos e detalhes mostram barras com preenchimento proporcional ao uso na
  cor de destaque configurada no GNOME. Textos mantêm a cor normal do tema;
  ausência de leitura oculta a barra em vez de representar consumo zero.
- Consulta ao habilitar e sorteia, por provider, um novo intervalo de 20 a 60
  segundos após cada consulta terminar, tanto em atividade quanto em repouso.
  Essa variação não garante evitar bloqueios. Abrir o menu e atualizar manualmente consultam
  novamente, respeitando intervalo mínimo de 15 segundos e backoff.
- O timer acompanha o próximo prazo sorteado ou o backoff, sem consultas sobrepostas.
  Atualização após renovação depende da confirmação do backend, não de zerar a UI.
- Detecta mudanças em `auth.json`, cancela consultas antigas e confirma a conta
  Codex antes de restaurar seu cache. Claude não observa `.claude.json`, pois o
  próprio CLI atualiza esse arquivo durante consultas. Mudanças de conta Claude
  são verificadas pelo próprio CLI na próxima consulta; resultados de uma troca
  durante a leitura são descartados.
  Credenciais não são alteradas nem renovadas pela extensão.
- Mantém a última leitura durante falhas temporárias, identificando sua idade.
  Backoff de 429 cresce de 60 segundos até 15 minutos; um Retry-After maior
  sempre prevalece. A leitura e o prazo de espera Codex permanecem salvos após
  reiniciar a extensão.
- Cancela HTTP, monitores, observers e timers ao desativar.
- As consultas de Claude e Antigravity executam somente comandos locais de uso,
  com timeout e cancelamento. A saída bruta e diagnósticos dos processos não
  são persistidos nem registrados. Claude e Antigravity não usam cache persistente
  porque seus relatórios não incluem um identificador de conta confiável.

## Limites e privacidade

O endpoint `https://chatgpt.com/backend-api/wham/usage` é interno ao produto,
não uma API pública estável. Uma mudança de formato gera estado incompatível,
nunca uma porcentagem inventada. Login somente por API key ou armazenado apenas
no keyring não é suportado neste MVP. Não alteramos a configuração do Codex.

Antigravity CLI usa o GNOME Keyring/KWallet por Secret Service no D-Bus da sessão.
O script `preview-shell.sh` cria um D-Bus isolado para o DevKit, sem esse keyring;
nesse preview o Antigravity pode falhar ou pedir login mesmo que funcione na
sessão GNOME normal. Não autenticamos dentro do preview.

Atividade significa alterações em arquivos de sessão de hoje ou ontem, com
90 segundos de tolerância. Não lemos seus conteúdos. Sessões antigas retomadas,
outros dispositivos ou clientes sem estes arquivos continuam cobertos pela
consulta periódica e pela abertura do menu, não pela heurística de atividade.
Não afirmamos que um agente está trabalhando ou esperando aprovação.

GSettings guarda leituras Codex normalizadas e o hash da identidade da conta/diretório.
O histórico de tokens é reconstruído dos registros locais e fica apenas em memória.
Leituras de cota Claude e Antigravity são mantidas apenas em memória. Emails do
`auth status` são usados transitoriamente para o hash; nunca são salvos ou logados,
assim como tokens e respostas brutas.
Nenhum cookie é lido; nenhuma inferência é iniciada; não há telemetria.
Redirecionamentos HTTP são recusados e consultas têm timeout e cancelamento.
Limites adicionais, créditos empresariais, alertas e múltiplas contas simultâneas
ficam para versões seguintes. O código não confunde cotas com tokens ou dólares.

## Histórico de sete dias

O gráfico “Tokens locais · 7 dias” mostra sete barras, um título e uma inicial do
dia abaixo de cada barra. O tooltip mostra somente a data e os tokens daquele dia;
o total registrado nos sete dias aparece uma vez abaixo do gráfico.
Não converte percentual de cota em tokens. Os detalhes e barras são atualizados
sem recriar os atores; o tooltip permanece visível nas trocas rápidas entre dias.

A coleta requer `python3`, usando somente a biblioteca padrão, em subprocesso
cancelável. Codex lê eventos `token_count` de `sessions/*.jsonl` no Codex home;
Claude lê somente os campos de uso de mensagens assistant em `projects/` e
`transcripts/` no `CLAUDE_CONFIG_DIR` ou `~/.claude`. Antigravity consulta somente
`gen_metadata.data` e `steps.metadata` das bases SQLite de conversas do CLI e da
extensão IDE em `GEMINI_CLI_HOME` ou `~/.gemini`, em modo somente leitura.
Prompts, respostas e conteúdo de conversas não são usados, exibidos ou persistidos.

Codex usa diferenças entre contadores acumulados e elimina eventos repetidos;
o cache de entrada e reasoning já fazem parte do total informado e não são
somados novamente. Claude inclui entrada, saída, leitura e criação de cache,
deduplicando mensagens, inclusive atualizações de streaming. Antigravity inclui
entrada, cache, saída e thinking dos metadados de geração, deduplicando respostas.
O formato protobuf do Antigravity é interno; campos de uso e timestamp são
validados e gerações sem data confiável são excluídas, nunca atribuídas ao mtime.

Datas usam o fuso local. Dias sem registros ficam vazios e mostram “Sem dados”,
não consumo zero. Registros corrompidos ou sem timestamp podem produzir uma série
parcial, indicada no tooltip. Falhas na coleta não impedem consultar as cotas.
O gráfico aparece uma vez por provider, não por cota semanal ou modelo.

O escopo é o histórico **do cliente local**, não o histórico oficial da conta
autenticada: os arquivos podem conter uso de mais de uma conta e não identificam
consistentemente qual conta pagou cada chamada. Esses números não são associados
à identidade da cota e não incluem outros dispositivos, apps web ou OpenCode.
Os agregados ficam somente em memória, são reconstruídos ao consultar e não
usam o antigo campo persistido `usage-history`. Providers desabilitados não coletam.

## Traduções

A interface usa gettext e acompanha o idioma ativo no GNOME. O português é o texto
de origem e fallback; `po/en.po` fornece as traduções em inglês. Textos visíveis
novos devem ser marcados com gettext na camada de apresentação e incluídos no
catálogo. `npm run pack` compila e inclui os catálogos no pacote da extensão.
Depois de alterar traduções, feche e reabra as preferências ou reinicie a sessão
DevKit para carregar o catálogo atualizado.

## Estrutura e extensão para outros providers

| Diretório | Responsabilidade |
| --- | --- |
| `src/domain/` | Estado da leitura, erros e estratégias de polling/backoff |
| `src/application/` | Coordenação de providers, concorrência e Observer |
| `src/providers/` | Adapters, parsers e contexto de execução local de cada provider |
| `src/infrastructure/` | HTTP Soup 3, arquivos Gio, timers e persistência |
| `src/presentation/` | Indicador, menu e formatação independente do provider |
| `src/composition/` | Construção explícita das dependências |
| `tests/` | Fixtures sintéticas e testes unitários/GJS/Shell |

Cada provider implementa `id`, `name`, `start(onAccountChanged)`,
`readAccount(cancellable)`, `fetch(account, cancellable, now)`, `isActive(now)`
e `destroy()`. A conta possui `key`, um hash estável, e dados transitórios de
autenticação que nunca entram no registro ou repository. `fetch` retorna
`{plan, source, headlineId, windows}`. Cada janela contém `id`, `label`,
`usedPercent`, `resetsAt` e `duration`; campos desconhecidos usam `null`.
Todos os horários são segundos Unix. Falhas usam `UsageError(code, retryAfter)`.
O histórico local é independente desse contrato de cotas: o coletor devolve
`{scope: 'local-client', days: [{date, tokens}], partial}`. Datas são locais,
contagens são inteiros não negativos e registros ausentes não significam zero.
Não se atribuem esses tokens à identidade da conta autenticada nem a uma cota.

Novo provider: criar seu Adapter e parsers, testar com fixtures e adicioná-lo
à composição. Coordenador e menu não precisam de condicionais por provider.
Domínio/aplicação não dependem de GI e são testados diretamente no Node.
Preferimos composição, injeção, Adapter, Strategy e Observer a hierarquias
abstratas. `AGENTS.md` impõe nomes claros, código sem comentários e até
100 linhas físicas por arquivo. `npm run check` verifica essas restrições.
`TODO.md` registra validações automatizadas concluídas e verificações manuais
que dependem de outras contas ou ambientes.

## Testar e empacotar

Requisitos: GNOME 51, GJS, Soup 3, GTK/Adwaita, ferramentas de extensões,
`glib-compile-schemas`, gettext, Python 3, Node para testes e Shell DevKit para integração.
Claude Code (`claude`) e Antigravity CLI (`agy`) são opcionais.
Não há dependências npm nem etapa de transpilation.

```bash
npm test
npm run check
npm run test:gjs
npm run test:prefs
npm run test:shell
npm run pack
```

`test:shell` instala e ativa somente numa sessão DevKit com providers CLI
desativados e login Codex isolado. Testes comuns usam fixtures sintéticas e
nunca chamam contas ou rede. `test:prefs` usa backend de configurações em memória e caminhos
de bibliotecas do Arch. O pacote fica em `dist/ai-usage@ryannnkl.com.shell-extension.zip`.
Para consultar uma conta real explicitamente: `AI_USAGE_LIVE_CODEX=1 npm run test:live`.

Instalação manual na sessão principal, quando desejar:

```bash
gnome-extensions install --force dist/ai-usage@ryannnkl.com.shell-extension.zip
```

Reinicie apenas o DevKit durante desenvolvimento; disable/enable não recarrega módulos.
O MVP foi validado no GNOME 51.0; não declara suporte ao GNOME 50.

## Versão e desenvolvimento

`package.json` usa a versão de release `0.2.0`; `metadata.json` usa o contador
inteiro de versão do GNOME, atualmente `2`. As tags seguem `v0.2.0`.
O histórico das mudanças está em [CHANGELOG.md](CHANGELOG.md).

Relate problemas nas [issues](https://github.com/Ryannnkl/gnome-ai-usage/issues),
incluindo versão do GNOME, provider afetado e como reproduzir, sem publicar
credenciais, respostas brutas, conversas ou logs que contenham dados privados.
Features partem de `develop`; `main` contém versões validadas. Consulte
[AGENTS.md](AGENTS.md) e [TODO.md](TODO.md) antes de contribuir.
