# Decisions

Record every choice the handoff left open, every departure from it, and every new dependency with its reason. Newest entries at the bottom of each section.

## Naming

- App name `kintsugi` instead of the handoff's `cp-tracker`. Chosen by the owner, 2026-11-11: the app will also hold the paper queue and habits, so a CP-only name would narrow.
- Bundle identifier `dev.nash.kintsugi`. It names the app data directory, so changing it later strands the existing database.
- Core package stays `tracker-core` (handoff).

## Machine (setup, 2026-11-11)

- Windows 11 Home Single Language 10.0.26200, AMD64.
- Found: git 2.55.0.windows.3, Node.js 24.20.0 (via nvm4w), npm 11.19.0, corepack 0.35.0, WebView2 157.0.4341.46.
- Installed by the setup agent with owner approval: rustup 1.29.3 (`winget install --id Rustlang.Rustup`), host `x86_64-pc-windows-msvc`; pnpm 12.18.0 (`corepack enable pnpm`).
- Missing at setup: Microsoft C++ Build Tools. Needs admin; left to the owner.
- Installed by the owner, 2026-11-13: Visual Studio Build Tools 2026 (18.12.12405.243), "Desktop development with C++", Windows SDK 10.0.26100.
- Project folder renamed by the owner from `New folder` to `Kintsugi`. No tracked file depends on the folder name.
- `vite.config.ts` ignores `target/` and `crates/` as well as `src-tauri/`: the workspace moved `target/` to the root, and Vite's watcher hit `EBUSY` locks on build output during `tauri dev`.

## Versions

| Tool                             | Version                  | Where pinned                |
| -------------------------------- | ------------------------ | --------------------------- |
| Rust                             | 1.99.1 + rustfmt, clippy | `rust-toolchain.toml`       |
| Node.js                          | 24 (LTS)                 | `.nvmrc`, `engines`         |
| pnpm                             | 12.18.0                  | `packageManager`, `engines` |
| create-tauri-app                 | 4.7.5                    | scaffold only               |
| tauri / tauri-build              | 2.12.5 / 2.7.4           | `Cargo.lock`                |
| @tauri-apps/api, @tauri-apps/cli | 2.12.4                   | `pnpm-lock.yaml`            |
| sqlx                             | 0.9.0                    | `Cargo.lock`                |
| tokio                            | 1.54.1                   | `Cargo.lock`                |
| thiserror                        | 2.0.21                   | `Cargo.lock`                |
| serde                            | 1.0.229                  | `Cargo.lock`                |
| React                            | 19.3.1                   | `pnpm-lock.yaml`            |
| TypeScript                       | 6.0.3                    | `pnpm-lock.yaml`            |
| Vite                             | 8.3.7                    | `pnpm-lock.yaml`            |
| ESLint                           | 10.14.0                  | `pnpm-lock.yaml`            |
| Prettier                         | 3.9.10                   | `pnpm-lock.yaml`            |
| Vitest                           | 5.1.0                    | `pnpm-lock.yaml`            |

## Toolchain

- Tauri 2, not 3: crates.io lists `tauri 3.0.0-alpha.6`, an alpha. The generator's default (`--tauri-version` latest stable) is 2.
- Rust pinned to an exact release (1.99.1), not the moving `stable` channel name, so a new Clippy lint cannot break `-D warnings` without a commit. Bump deliberately.
- `packageManager: pnpm@12.18.0` so corepack and `pnpm/action-setup` use the same pnpm.
- `.gitattributes` forces LF. Windows git checks out CRLF by default, which would fail `prettier --check` and differ from CI.
- pnpm 12 enforces a minimum release age. Prettier 3.10.0 was one day old, so Prettier is 3.9.10; the policy stays on.

## Rust

- Workspace lints: `unsafe_code = "forbid"`, `clippy::unwrap_used` and `clippy::expect_used` denied. `clippy.toml` allows them in tests, matching the rule "no unwrap or expect outside tests".
- Release profile moved from `src-tauri/Cargo.toml` to the workspace root; Cargo ignores profiles in members.
- sqlx features: `default-features = false`, plus `runtime-tokio`, `sqlite`, `migrate`, `macros`. `macros` is there for `sqlx::migrate!`, which embeds migrations in the binary. No TLS feature: no network database.
- Runtime query functions (`sqlx::query`, `query_as`, `query_scalar`), not the compile-time checked macros. The workspace builds without `DATABASE_URL` or `.sqlx` offline metadata. Revisit if the query count grows.
- `tracker_core::Pool` is a re-export of `sqlx::SqlitePool`, so `src-tauri` has no direct sqlx dependency.
- In-memory test pool: one connection, never closed, because each SQLite `:memory:` connection is a separate database.
- Startup opens the database in `setup` with `tauri::async_runtime::block_on`. A failure is stored as `DbState::Failed(message)` instead of aborting, so the window opens and the page shows the error.
- `CommandError { kind, message }` is the serialisable error for every command. `kind`: `databaseUnavailable` or `database`.
- Database file name: `kintsugi.db`.

## Schema

- `activity_log.kind` and `payload` are `NOT NULL`; the handoff left nullability open.
- `created_at` defaults to `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`: ISO 8601 UTC with milliseconds and a `Z`, which JavaScript `Date` parses. SQLite's `CURRENT_TIMESTAMP` has no zone marker.

## Tauri permissions

- Removed the scaffold's opener plugin and the unused `serde_json` (`tauri-plugin-opener`, `@tauri-apps/plugin-opener`, `opener:default`). The `health` command needs none of it. Only `core:default` remains.

## Frontend

- Reducer and state machine pattern, owner request 2026-11-11: each screen's logic is a pure reducer over a discriminated-union state, tested without React. Uses React's `useReducer`; no state library (handoff rules them out).
- ESLint `no-restricted-imports` blocks `@tauri-apps/api/core` outside `src/lib/api.ts`.
- `pnpm lint` runs ESLint then `prettier --check`, so the acceptance checks cover frontend formatting. `pnpm format` writes.
- ESLint config: `@eslint/js` recommended, `typescript-eslint` recommended (not type-checked, for speed), `react-hooks` flat recommended, `eslint-config-prettier` last.
- Prettier config: defaults (`{}`).
- Removed scaffold demo screen, CSS, and logos; the page title is "Kintsugi".
- `src/features/health/` holds the health page. It is infrastructure, not tracker domain.

## Dependencies added

| Package                                                | Why                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `sqlx`                                                 | Database access and migrations (handoff)                                  |
| `tokio` (dev, core)                                    | Async test runtime (`#[tokio::test]`); the app uses Tauri's Tokio runtime |
| `thiserror`                                            | Core error type (handoff)                                                 |
| `serde`                                                | Serialise `Health` and `CommandError` to the frontend                     |
| `eslint`, `@eslint/js`, `typescript-eslint`, `globals` | ESLint (handoff)                                                          |
| `eslint-plugin-react-hooks`                            | Enforce hook rules; the reducer pattern leans on `useEffect`              |
| `prettier`, `eslint-config-prettier`                   | Prettier, and keep ESLint from fighting it (handoff)                      |
| `vitest`                                               | Tests (handoff)                                                           |
| `jsdom`                                                | DOM for component tests                                                   |
| `@testing-library/react`, `@testing-library/dom`       | Render components and query by role in tests                              |

## CI

- One job on `ubuntu-24.04`. System packages are the Debian list from Tauri's prerequisites page, verbatim.
- `rustup toolchain install` reads `rust-toolchain.toml`; no third-party Rust action.
- Actions: `actions/checkout@v7`, `Swatinem/rust-cache@v2`, `pnpm/action-setup@v6`, `actions/setup-node@v7` (`cache: pnpm`). Latest tags on 2026-11-11.
- Runs on every push and pull request, with read-only `contents` permission.

## Deferred

- End-to-end WebDriver tests (handoff).
