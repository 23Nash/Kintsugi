# Appendix B: Submission sync

> Planner report, written 2026-11-25 by a read-only planning agent. Kept as written for its detail (SQL, signatures, test lists). Where it conflicts with another appendix, [README.md](README.md) section "Reconciled decisions" wins.

### What I could and couldn't check

- **Read:**
  - The repo files AGENTS.md, docs/decisions.md, the Cargo.toml files, Cargo.lock, `crates/core/src/*` and `src-tauri/src/*`.
  - Tauri's own manifest at `~/.cargo/registry/src/*/tauri-2.12.5/Cargo.toml`.
  - The AtCoder Problems API doc at https://raw.githubusercontent.com/kenkoooo/AtCoderProblems/master/doc/api.md (same content as https://github.com/kenkoooo/AtCoderProblems/blob/master/doc/api.md).
  - crates.io API data for reqwest, rustls, ring, aws-lc-rs, serde_json, keyring, wiremock and httpmock.
- **Codeforces is not verified.** codeforces.com and mirror.codeforces.com do not resolve in this session; those hosts would have to be allowed in the network settings. A web search shows a snippet of https://codeforces.com/apiHelp stating "at most 1 call per two seconds" and that going over returns `status: "FAILED"` with the comment "Call limit exceeded". Everything else I say about Codeforces below comes from memory and is marked **Unverified**.
- **AtCoder Problems source not read.** The backend handlers returned 404, so details beyond the doc are unverified too.

### 1. Which judges, and in what order

**Codeforces first. The assumption holds.**

- It is an official public API that needs no key for public methods.
- Unverified (from memory):
  - Base URL is `https://codeforces.com/api/{method}`. Responses look like `{"status":"OK","result":…}` or `{"status":"FAILED","comment":"…"}`.
  - `user.status(handle, from (1-based), count)` returns Submissions newest first, ordered by id descending.
  - Submission fields: `id`, `contestId`, `creationTimeSeconds` (unix seconds), `problem`, `author`, `programmingLanguage`, `verdict` (absent while judging), `testset`, `passedTestCount`, `timeConsumedMillis`, `memoryConsumedBytes`.
  - Verdict strings: `OK`, `WRONG_ANSWER`, `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`, `RUNTIME_ERROR`, `COMPILATION_ERROR`, `IDLENESS_LIMIT_EXCEEDED`, `CHALLENGED`, `SKIPPED`, `TESTING`, `PARTIAL`, `FAILED`, `REJECTED`, `PRESENTATION_ERROR`, `SECURITY_VIOLATED`, `CRASHED`, `INPUT_PREPARATION_CRASHED`.
  - The embedded Problem carries `contestId`, `problemsetName`, `index`, `name`, `type`, `points`, `rating` (optional), and `tags` (a list of strings).
  - `problemset.problems` returns `{problems, problemStatistics}`.
  - `user.info(handles)` checks a handle and returns its canonical letter case.
  - Gym contests (contestId ≥ 100000) are not in the problemset. Rating is often missing until after the contest.
- Because each submission embeds its problem, including tags and rating, the problemset is only needed to fill in ratings later and for future recommendations.

**AtCoder second, through kenkoooo's AtCoder Problems.**

- **Verified from the doc:**
  - Submissions endpoint: `GET https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user={id}&from_second={unix}`. It returns "up to 500 submissions after the specified time".
  - Etiquette: "sleep for more than 1 second between accesses".
  - The maintainers "sometimes deprecate old APIs".
  - Static resources: `resources/merged-problems.json`, `resources/problem-models.json` (estimated difficulty), `resources/contests.json`.
- **Not stated in the doc:** any User-Agent, gzip or caching rules. Send a descriptive generic User-Agent anyway, with no personal details.
- **Unverified:**
  - Submission fields: `id`, `epoch_second`, `problem_id`, `contest_id`, `user_id`, `language`, `point`, `result` (`AC`/`WA`/`TLE`/`MLE`/`RE`/`CE`/`OLE`/`IE`/`WJ`…), `execution_time`.
  - Whether `from_second` is inclusive.
  - Ascending order.
  - Difficulty is a raw IRT value that needs the usual clipping transform for low values.
- **AtCoder has no tags.** Its weak-topic data will be empty unless the owner tags problems by hand. That is a product decision.
- **Reliability risk:** a forum post from December 2025 reports kenkoooo was down for 2–3 weeks (search result, not read in full). Sync must treat the source as unavailable without breaking anything.

**LeetCode is deferred.**

- It only has an unofficial GraphQL API. Public data covers recent accepted submissions only; full history needs the `LEETCODE_SESSION` and `csrftoken` cookies. That means a secret plus Terms of Service risk.
- Record the deferral in docs/decisions.md.

### 2. Where the HTTP client lives, and which crate

- **Lockfile finding:** reqwest 0.13.5 is already in Cargo.lock, but Tauri pulls it in only on Android and iOS, with no TLS features. Tauri's own optional `rustls-tls` feature uses `reqwest/rustls-no-provider` with rustls on `ring`. So the Windows desktop build has no TLS stack today, and adding one is new weight whichever crate we pick.
- **Recommendation:** reqwest 0.13.5, the newest stable, which keeps one reqwest version.
  - Settings: `default-features = false`, features `["rustls", "json", "query", "gzip", "system-proxy"]`.
  - In 0.13, `rustls` means aws-lc-rs plus rustls-platform-verifier, which uses the Windows certificate store.
  - Add serde_json 1.0.154 (already in the lockfile) as a direct dependency.
  - Add `tokio` as a normal core dependency with `time`, plus `test-util` for tests.
- **Spike first:** build on the owner's Windows machine. aws-lc-sys needs the MSVC C toolchain, which is still missing there, though Tauri needs it anyway.
  - If aws-lc-sys is a problem, fall back to `rustls-no-provider` plus `rustls = {default-features=false, features=["ring"]}`, matching Tauri's choice. Install the provider once and ignore the "already installed" `Err`.
- **Release age:** rustls 0.23.46 was published 2026-11-12. Cargo has no release-age policy. Assumption: we follow the spirit of the pnpm rule and only take versions at least 7 days old; 0.23.46 qualifies.
- **Placement:** everything goes in `crates/core/src/sync/`. reqwest is not Tauri, so the core boundary holds, and the future server can reuse it. Check with `cargo tree -p tracker-core | grep tauri`.
  - `sync/http.rs` defines:
    - `pub trait Fetcher: Send + Sync { fn get(&self, req: &HttpRequest) -> impl Future<Output = Result<HttpResponse>> + Send; }`
    - `HttpRequest {url, query: Vec<(..)>}`
    - `HttpResponse {status: u16, body: Vec<u8>}`
  - It uses native async-in-trait from edition 2024, with generics rather than `dyn`, so no async-trait crate.
  - `ReqwestFetcher` implements the trait: timeout 30 s, connect timeout 10 s, User-Agent `kintsugi/<version>`.
  - `sync/limiter.rs` enforces a minimum interval per host, with exponential backoff.
  - Platform modules (`sync/codeforces.rs`, `sync/atcoder.rs`) parse JSON and run the algorithm, generic over `F: Fetcher`.
- **Errors:** extend `tracker_core::Error` with:
  - `Http(String)`
  - `Parse(serde_json::Error)`
  - `Platform { platform, message }`, which carries the Codeforces FAILED comment, such as handle not found
  - `RateLimited`
  - `Cancelled`

### 3. Sync algorithm

- **General:**
  - The platform submission id is the identity.
  - Every write is an upsert on `(platform, platform_submission_id)`, so overlap and repeats are harmless.
  - Each page is written in one transaction, together with its cursor update.
  - Timestamps are stored as UTC unix seconds (INTEGER); local-time day boundaries are worked out only at display time.
  - Unknown verdict strings map to `Other`, with the raw string kept.
- **Normalised verdicts:** Accepted, WrongAnswer, TimeLimit, MemoryLimit, RuntimeError, CompileError, Hacked/Challenged, Skipped, Pending, Other. Always store the raw verdict too.
- **Codeforces backfill (first sync):**
  - Request pages with `from=1,1+N,…` and `count=N`, where N = 500.
  - New submissions arriving mid-backfill only shift offsets forward. That causes duplicates, never gaps.
  - Set `backfill_complete` when a page comes back shorter than N.
  - If it fails midway, the next run restarts at `from=1` and the upserts make the repeat cheap. 10k submissions means 20 requests, about 40 s.
- **Codeforces incremental:**
  - `stop_id = min(max_final_id, min_pending_id − 1)`.
  - Fetch pages of 100 until a page contains an id ≤ `stop_id`.
  - This re-fetches still-judging submissions until they get a final verdict.
- **AtCoder (backfill and incremental are the same loop):**
  - `from_second = min(cursor_second, earliest_pending_second)`, starting at 0.
  - Re-request from the last page's `epoch_second` (inclusive, deduplicated by id) rather than `+1`. That way a same-second boundary can't drop rows, whether or not the endpoint is inclusive.
  - Stop when a page has fewer than 500 rows or no new ids.
- **Rate limiting:**
  - Codeforces: at least 2.1 s between calls.
  - kenkoooo: at least 1.5 s.
  - On HTTP 429 or 503, a "Call limit exceeded" comment, or a non-JSON body (an HTML error page): back off 4/8/16 s, up to 3 retries, then fail. The cursor stays where it was.
  - Assumption: there is one sync at a time across all accounts, so the limiter can be a simple per-host `Instant`.
- **Partial failure:** stop at the first account error, record `last_error`, and continue with the other accounts. The next run resumes from the stored cursor.
- **Problem metadata:**
  - Cache in a `metadata_cache(source, fetched_at, etag)` table.
  - Codeforces `problemset.problems`: time to live 24 h, and also refetch when synced problems lack a rating.
  - AtCoder `merged-problems.json` and `problem-models.json`: time to live 7 days. Use a conditional GET if the server sends an ETag (unverified).
  - Upsert submission problems from submission payloads immediately, so metadata is never a blocking step.
- **Cancellation:** a `tokio::sync::watch::Receiver<bool>` (no new dependency), checked between pages and while sleeping. It returns `Error::Cancelled`, and committed pages stay.
- **Progress:** core takes `on_event: impl FnMut(SyncEvent)`. `SyncEvent` is `Started{account}`, `Page{account, fetched, inserted}`, `AccountDone`, `AccountFailed{message}`, or `Finished`.

### 4. What triggers a sync, and how the UI hears about it

- **Triggers:**
  - A manual "Sync now" button.
  - On app start, if the last success was more than 15 minutes ago.
  - Periodically, every 30 minutes, while the app is open.
- **Scheduler lives in core:** `sync::run_periodic(pool, fetcher, interval, cancel, on_event)`, so it can be tested. The shell spawns it in `setup` with `tauri::async_runtime::spawn`, only when `DbState::Ready`.
- **Shell state:** a managed `SyncState` holding a single-flight guard (a `tokio::Mutex` / `AtomicBool`, reached through Tauri's runtime) and a `watch::Sender` for cancel.
- **Commands:** `sync_now`, `sync_cancel`, `sync_status` (last result per account, for the first render), `accounts_list`, `account_add`, `account_remove`. Errors map to new `CommandError` kinds: `network`, `platform`, `syncInProgress`.
- **Progress to the UI:**
  - Use Tauri global events (`app.emit("sync://event", …)`), not Channels, because background syncs are not started by a command.
  - The frontend calls `sync_status` on mount and then listens.
  - `core:default` already includes `core:event:default`. Assumption, to confirm against the generated schema: no capability change is needed.
  - The `listen` wrapper goes in `src/lib/api.ts`, to keep the single-entry-point rule even though ESLint only blocks `/core`.
  - `src/features/sync/syncMachine.ts` is a reducer with states idle / syncing{progress} / failed / done.

### 5. Storing handles

- Use an `accounts` table, not settings, since there can be several handles per platform.
- No secrets are needed for Codeforces or AtCoder.
- When adding a Codeforces account, check it with `user.info` and store the canonical letter case.
- Codeforces allows handle changes. Data stays linked because submissions key on submission id, and the owner can edit the handle.
- If LeetCode ever happens:
  - Store the cookie in the OS keychain with the `keyring` crate (4.2.0, Windows Credential Manager), never in SQLite. Only a `credential_ref` would go in the database.
  - Record it in docs/decisions.md.

### Fields needed from the schema planner

- **accounts:** `id`, `platform` (`'codeforces'|'atcoder'`), `handle`, `enabled`, `created_at`, `UNIQUE(platform, handle)`.
- **sync_state** (one row per account):
  - `cursor_id` (Codeforces max final id), `cursor_second` (AtCoder)
  - `backfill_complete`
  - `last_attempt_at`, `last_success_at`, `last_error`
- **submissions:**
  - `platform`, `platform_submission_id` (TEXT, so LeetCode fits later), `UNIQUE(platform, platform_submission_id)`
  - `account_id`, `problem_id` (foreign key)
  - `submitted_at` (unix seconds)
  - `verdict` (normalised), `raw_verdict`
  - `language`, `time_ms`, `memory_bytes`, `points`
  - Optionally `raw_json`, for re-parsing later
- **problems:**
  - `platform`, `platform_problem_id` (Codeforces `"{contestId}{index}"` or the problemset name; AtCoder `"abc300_a"`), unique together
  - `contest_id`, `index`, `name`
  - `rating` (int, Codeforces), `difficulty` (real, AtCoder raw)
  - `metadata_refreshed_at`
- **problem_tags:** `problem_id`, `tag`, `source` (`'platform'|'manual'`).
- **metadata_cache:** `source`, `fetched_at`, `etag`.

### 6. Tests (no network in CI)

- **Fixtures:** `crates/core/tests/fixtures/{codeforces,atcoder}/*.json`. They are trimmed real responses, recorded once by hand with curl, plus hand-written edge cases:
  - a FAILED envelope
  - a missing verdict
  - a gym submission
  - an unknown verdict
  - an HTML error body
  - a 500-row AtCoder page with a same-second boundary
- **Unit tests in each module (`include_str!`):** parsing and verdict mapping.
- **Database tests in `crates/core/tests/sync_*.rs` with `open_in_memory()`:**
  - They use a `FakeFetcher` that serves queued responses and records requests.
  - Cases: backfill, incremental stop condition, a second run being idempotent, a pending verdict becoming final, resume after a failure on page 2, cancellation, metadata time to live.
  - Use `#[tokio::test(start_paused = true)]` so limiter and backoff sleeps are instant and spacing can be asserted.
- **`ReqwestFetcher` test:** a local `tokio::net::TcpListener` serving canned HTTP. That needs no wiremock dependency and still meets "every core fn tested".
- **No live tests in the suite.** Ignored tests would bend the done gate. An optional `examples/record_fixtures.rs` could re-record fixtures by hand.
- **Frontend:** reducer tests, plus component tests with the `api.ts` wrappers and `listen` mocked.

### 7. Commit and PR sequence

1. Core: error variants, plus the `sync::http` `Fetcher` trait and request/response types, plus a `FakeFetcher` test helper.
2. Core: per-host limiter and backoff (adds the tokio `time` dependency and a decisions entry), with paused-time tests.
3. Core: Codeforces DTOs, parsing and verdict normalisation, with fixtures (adds serde_json and a decisions entry).
4. Schema migrations, from the schema planner.
5. Core: accounts CRUD and Codeforces handle check.
6. Core: Codeforces backfill and incremental sync, with progress, cancellation and resume tests.
7. Core: Codeforces problemset cache with time to live.
8. Core: `ReqwestFetcher` (adds reqwest and a decisions entry noting the TLS stack choice and the Windows spike result), with the local-socket test and a `cargo tree` check.
9. Shell: `SyncState`, sync and account commands, event emission, new `CommandError` kinds.
10. Shell: sync on start and the periodic scheduler (the loop lives in core).
11. Frontend: `api.ts` wrappers, the sync reducer and button, the accounts screen, and tests.
12. AtCoder: parsing, sync, metadata (merged-problems and problem-models), and fixtures.
13. docs/decisions.md: the LeetCode deferral and the keyring plan.

### Open questions for the owner

1. Which handles should be synced, and could there be more than one per platform?
2. Do compile errors and Codeforces "SKIPPED" count as failed attempts for resurfacing?
3. Should gym and virtual or practice submissions be counted, or only contest and practice?
4. AtCoder has no tags. Are manual tags acceptable, or should AtCoder be left out of weak-topic stats?
5. Is a 30-minute periodic sync acceptable, or manual and on-start only?
6. If aws-lc-rs won't build on your Windows machine, may we use ring instead?
7. Should codeforces.com be allowed in future planning and agent sessions, so the API details can be verified before implementation?
8. Is LeetCode worth the cookie, keychain and Terms of Service risk at all?

### Critical files for implementation

- /home/user/Kintsugi/crates/core/Cargo.toml
- /home/user/Kintsugi/crates/core/src/error.rs
- /home/user/Kintsugi/crates/core/src/lib.rs (new module `crates/core/src/sync/`)
- /home/user/Kintsugi/src-tauri/src/lib.rs
- /home/user/Kintsugi/src-tauri/src/error.rs
- /home/user/Kintsugi/docs/decisions.md

### Sources

- https://raw.githubusercontent.com/kenkoooo/AtCoderProblems/master/doc/api.md
- https://codeforces.com/apiHelp (search snippet only; the host was blocked)
- https://crates.io/api/v1/crates/reqwest (and the same endpoint for rustls, aws-lc-rs, ring, keyring)
- https://mirror.codeforces.com/topic/149704/en1 (the kenkoooo outage report; search result only)
