# AI Usage — project rules

## Code

- Internal code lives in `src/`; tests, scripts, icons, and schemas stay outside it.
- `extension.js` and `prefs.js` remain in the root as GNOME Shell entry points.
- Never add comments to code, including JSDoc and inline comments.
  Script shebangs are allowed. Explanations belong in the README.
- Use descriptive English names: PascalCase for classes, camelCase for
  variables and methods, and filenames that reflect their responsibilities.
- Aim for roughly 100 lines per code file as a readability guideline, not a hard limit.
  Do not split files merely to meet a line count or remove useful whitespace.
- Use four-space indentation, single quotes, semicolons, and spaces inside
  named imports, object literals, and destructuring braces.
- Separate GI, Shell, and local imports with a blank line, preserving their order.
- Separate logical steps inside functions with blank lines: guards, preparation,
  operations, and results. Keep related statements together; do not space every line.
- One responsibility per class. Prefer composition and dependency injection
  over inheritance, singletons, global state, or service locators.
- Use Adapter for providers, Strategy for policies, and Observer for UI.
  Do not add patterns, abstract classes, or dependencies without need.
- The domain and application layers do not import GI, GTK, St, or internal Shell modules.
- Providers do not know about the interface. The UI does not know about endpoints or credentials.
- Every integration must use the contract documented in the README, without conditionals
  based on provider name in the coordinator or interface.
- Dependencies are passed through the constructor; `extension.js` is the composition root.
- Keep functions short, use early returns, and validate at boundaries.

## GNOME

- Targets: GNOME Shell 50 and 51, GJS with ESModules, with no transpilation step.
- Consult current guides before changing Shell APIs.
- `disable()` is synchronous and removes timers, signals, monitors, actors, and requests.
- Never publish or persist responses after deactivation or a context switch.
- Content I/O and HTTP are asynchronous and cancellable, with limited timeouts.
- Respect the GNOME theme; do not use fixed colors or draggable UI.
- Do not use `St.vertical`, `imports.*`, `Alt+F2 r`, or `gnome-shell --nested`.
- Declare only versions actually tested in `metadata.json`.

## Security and usage data

- Reuse only local credentials belonging to the enabled provider, in read-only mode.
- Do not write, renew, or delete credentials belonging to other programs.
- Never log or persist tokens, headers, raw HTTP responses, or conversations.
- Do not read browser cookies or session contents to infer activity.
- The cache contains only normalized usage readings, timestamps, and a hashed identity.
- Invalidate readings when switching accounts. Failure does not mean zero usage.
- Respect `Retry-After`, including during manual refresh and after restarting.
- File activity is a scheduling heuristic, not the agent's state.

## Quality and Git

- Run `npm test`, `npm run check`, and GJS tests when changing integrations.
- Cover parsing, failures, backoff, account isolation, concurrency, and cleanup.
- Use synthetic fixtures; ordinary tests never access real accounts or the network.
- Validate enable/disable and the menu in Shell DevKit before declaring compatibility.
- Do not commit, merge, install, or enable in the main session without being asked.
