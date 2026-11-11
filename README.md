# Kintsugi

A personal competitive programming tracker. A local Tauri desktop app with a Rust backend, a React + TypeScript frontend, and one SQLite file in the app data directory.

Agents: read [AGENTS.md](AGENTS.md). Decisions and versions: [docs/decisions.md](docs/decisions.md).

## Prerequisites

1. The system packages for your OS from Tauri's prerequisites page: https://v2.tauri.app/start/prerequisites/
   - Windows: Microsoft C++ Build Tools with "Desktop development with C++". WebView2 ships with Windows 10 (1803+) and 11.
   - Debian/Ubuntu: the `apt install` list on that page (the CI workflow uses the same list).
2. Rust via rustup (https://www.rust-lang.org/tools/install). On Windows, use the MSVC host. `rust-toolchain.toml` installs the pinned version on first use.
3. Node.js 24 (`.nvmrc`).
4. pnpm, at the version in `package.json` `packageManager`:

```bash
corepack enable pnpm
```

## Setup from a fresh clone

Run from the repository root, in order:

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

```bash
cargo fmt --all --check
```

```bash
cargo clippy --workspace --all-targets -- -D warnings
```

```bash
cargo test --workspace
```

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

The frontend is built first because the Tauri crate expects `dist/` to exist when it compiles.

## Run

```bash
pnpm tauri dev
```

The page shows the database health. The database is `kintsugi.db` in the app data directory for identifier `dev.nash.kintsugi`:

- Windows: `%APPDATA%\dev.nash.kintsugi\kintsugi.db`
- Linux: `~/.local/share/dev.nash.kintsugi/kintsugi.db`
- macOS: `~/Library/Application Support/dev.nash.kintsugi/kintsugi.db`

## Layout

```
Cargo.toml              workspace root
rust-toolchain.toml
crates/core/            tracker-core: domain logic and database; no Tauri dependency
  migrations/           SQL migration files
  src/db.rs             pool setup, migrations, health
  src/error.rs
  src/tracker/          tracker domain (empty)
  tests/                tests that need a database
src-tauri/              Tauri shell: startup, state, thin commands
src/                    React + TypeScript frontend
  features/health/      health page and its state machine
  features/tracker/     tracker screens (empty)
  lib/api.ts            typed wrappers around Tauri commands
docs/decisions.md
AGENTS.md
```
