# Kintsugi: agent instructions

Kintsugi is a local desktop app that tracks the owner's competitive programming practice: it syncs submissions, resurfaces failed problems, and shows weak topics. It is a Tauri 2 app with a Rust backend, a React + TypeScript frontend, and one SQLite file on the owner's machine; no server, no login.

## Commands

- Run the app: `pnpm dev:log` in the background. It runs `pnpm tauri dev` and writes output to `tauri-dev.log`. Wait on it with a background `until grep -qE "kintsugi\.exe|error|ELIFECYCLE" tauri-dev.log; do sleep 1; done`. `ELIFECYCLE ... -1` means the window was closed. `tauri dev` opens `kintsugi-dev.db`, never the real `kintsugi.db`; agents never open the real database. `KINTSUGI_DB_PATH` overrides the path.
- Format: `cargo fmt --all` and `pnpm format`. The other checks are in the done gate below.

## Plan

- The roadmap is `docs/plan/steps.md`: milestones M0 to M7. Reasoning and detail are in `docs/plan/README.md` and its appendices. Where the plan lists an owner decision, use its default unless the owner has answered.
- The owner starts a milestone by turning it into a spec issue with tickets (`/to-spec`, `/to-tickets`); `steps.md` links each started milestone to its spec issue. Agents build tickets from the GitHub board, not steps straight from `steps.md`: the owner runs `/orchestrate` (`.claude/skills/orchestrate/SKILL.md`). Leave tickets assigned or under an `orchestrating` spec to it.

## Done gate

A task is done when this sequence passes, in order, with no edits to checks or config to make it pass:

```
pnpm install --frozen-lockfile
pnpm build
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
pnpm lint
pnpm typecheck
pnpm test
```

If passing would mean skipping a test, allowing a lint, loosening a rule, or turning off strict mode, stop and ask the owner.

## Boundaries

- `crates/core` (`tracker-core`) holds all domain logic and SQL, and depends on no Tauri crate. Check with `cargo tree -p tracker-core`.
- `src-tauri` holds startup, managed state, and thin commands: argument handling and error mapping into `CommandError`.
- Each domain gets its own module on both sides: `crates/core/src/<domain>/`, `src/features/<domain>/`.

## Frontend

- Components call typed wrappers in `src/lib/api.ts`; it is the only file that imports `@tauri-apps/api/core` (ESLint enforces this). Every command gets a wrapper there.
- Screens and styling: read `docs/design-system.md` first. Primitives live in `src/ui/<Name>/`, and colors come from tokens in `src/ui/tokens.css`.
- Screen logic is a pure reducer over a discriminated-union state (see `src/features/health/healthMachine.ts`). Components render state and dispatch events; side effects run in `useEffect` keyed on the state that needs them. React's `useReducer` only; ask before adding a state library.

## Database

- Schema changes are new files in `crates/core/migrations/`, named `<YYYYMMDDHHMMSS>_<description>.sql`. Applied migrations are immutable.
- Ask the owner before any migration that drops or rewrites data.
- Use sqlx runtime functions (`sqlx::query`, `query_as`, `query_scalar`) with `.bind()`, not the compile-time macros.

## Rust

- Error kinds are listed twice: `ErrorKind` in `src-tauri/src/error.rs` and `API_ERROR_KINDS` in `src/lib/api.ts`. Adding a kind means editing both lists and both drift tests (the Rust test in `error.rs` and the TS test beside `api.ts`).
- Return errors through `tracker_core::Error` and propagate them with `?`.

## Tests

- Every new core function has a test. Unit tests live in their module; tests that need a database go in `crates/core/tests/` using `open_in_memory()`.
- Every new command has a wrapper in `src/lib/api.ts` and a frontend test that mocks it. Frontend tests sit beside the file as `*.test.ts(x)`.

## Changes

- Every new dependency, Rust or JavaScript, gets a line in `docs/decisions.md` saying why.
- Small commits, one concern each.

## Agent skills

### Issue tracker

GitHub Issues on this repo, driven through `gh api` (REST only). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.
