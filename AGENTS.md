# AI Usage — regras do projeto

## Código

- Código interno vive em `src/`; testes, scripts, ícones e schemas ficam fora.
- `extension.js` e `prefs.js` permanecem na raiz como entradas do GNOME Shell.
- Nunca adicionar comentários ao código, incluindo JSDoc e comentários inline.
  Shebangs de scripts são permitidos. Explicações pertencem ao README.
- Usar nomes descritivos em inglês: PascalCase para classes, camelCase para
  variáveis e métodos, nomes de arquivos correspondentes à responsabilidade.
- Cada arquivo de código deve ter no máximo 100 linhas físicas, incluindo
  imports e linhas vazias. Isso também vale para testes, scripts e estilos.
- Ao atingir o limite, separar responsabilidades; não comprimir linhas,
  remover espaços de leitura ou criar fragmentos arbitrários para contorná-lo.
- Uma responsabilidade por classe. Preferir composição e injeção de dependências
  a herança, singletons, estado global ou service locators.
- Usar Adapter para providers, Strategy para políticas e Observer para UI.
  Não adicionar padrões, classes abstratas ou dependências sem necessidade.
- Domínio e aplicação não importam GI, GTK, St ou módulos internos do Shell.
- Providers não conhecem a interface. A UI não conhece endpoints ou credenciais.
- Toda integração deve usar o contrato documentado no README, sem condicionais
  por nome de provider no coordenador ou na interface.
- Dependências entram pelo construtor; extension.js é a raiz de composição.
- Manter funções curtas, retornos antecipados e validação nas fronteiras.

## GNOME

- Alvo inicial: GNOME Shell 51, GJS com ESModules, sem etapa de transpilation.
- Consultar os guias atuais antes de alterar APIs do Shell.
- disable() é síncrono e remove timers, sinais, monitores, atores e requisições.
- Nunca publicar ou persistir respostas após desativação ou troca de contexto.
- I/O de conteúdo e HTTP são assíncronos e canceláveis, com prazos limitados.
- Respeitar o tema GNOME; não usar cores fixas nem UI arrastável.
- Não usar St.vertical, imports.*, Alt+F2 r ou gnome-shell --nested.
- Declarar em metadata.json somente versões efetivamente testadas.

## Segurança e leituras

- Reutilizar apenas credenciais locais do provider habilitado, em leitura.
- Não escrever, renovar ou excluir credenciais de outros programas.
- Nunca logar ou persistir tokens, headers, respostas HTTP brutas ou conversas.
- Não ler cookies de navegadores nem conteúdo de sessões para inferir atividade.
- Cache contém apenas leituras normalizadas, timestamps e identidade hash.
- Invalidar leituras ao trocar de conta. Falha não significa consumo zero.
- Respeitar Retry-After, inclusive em atualização manual e após reiniciar.
- Atividade de arquivos é uma heurística de agendamento, não estado do agente.

## Qualidade e Git

- Executar npm test, npm run check e testes GJS ao mudar integrações.
- Cobrir parser, falhas, backoff, isolamento de contas, concorrência e cleanup.
- Usar fixtures sintéticas; testes comuns nunca acessam contas reais ou a rede.
- Validar enable/disable e menu no Shell DevKit antes de declarar compatibilidade.
- Não fazer commits, merges, instalação ou ativação na sessão principal sem pedido.
