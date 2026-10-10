# Validação entre ambientes

## Implementado e coberto por testes

- [x] Detectar Codex, Claude e Antigravity independentemente; testar as oito
  combinações possíveis, inclusive nenhum provider.
- [x] Exibir estado vazio e permitir iniciar/desativar o monitor sem providers,
  cache ou timer desnecessários.
- [x] Isolar falha ao iniciar ou consultar um provider para não bloquear os demais.
- [x] Resolver caminhos Codex e Claude padrão, explícitos, relativos e com `~/`;
  executar Claude com o mesmo `CLAUDE_CONFIG_DIR` resolvido.
- [x] Procurar CLIs no `PATH`, `~/.local/bin` e `~/.local/share/mise/shims`,
  tolerando executável ausente e `PATH` vazio.
- [x] Não ler metadata, email ou tokens Claude; não persistir leituras de
  identidade incerta e descartar a leitura anterior se a consulta falhar.
- [x] Cobrir CLI cancelável, autenticação ausente, processo indisponível,
  saídas inválidas, configuração de locale e watcher de perfil alternativo.
- [x] Verificar menu vazio no Shell DevKit e matriz de composição com fixtures
  sintéticas, sem consultar contas reais.

## Validação manual ainda necessária

- [ ] Confirmar login válido e sessão ausente para cada CLI em outros ambientes
  GNOME; testar mudanças de conta enquanto a extensão está ativa.
- [ ] Conferir contas Claude com `CLAUDE_CONFIG_DIR` personalizado e confirmar
  no próprio CLI que `/usage` consulta a sessão esperada.
- [ ] Testar descoberta depois de instalar um CLI enquanto a extensão já está
  ativa; reabilitar a extensão para repetir a descoberta de inicialização.
- [ ] Validar o menu com providers reais em combinações de zero a três em outra
  instalação GNOME 51 e registrar diferenças de distribuição/locale.
- [ ] Validar Antigravity com o keyring desbloqueado na sessão GNOME normal; não
  conectar automaticamente o D-Bus isolado do DevKit ao bus da sessão principal.
