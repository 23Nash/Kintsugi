# Appendix A: Domain model, schema and core API

> Planner report, written 2026-11-25 by a read-only planning agent. Kept as written for its detail (SQL, signatures, test lists). Where it conflicts with another appendix, [README.md](README.md) section "Reconciled decisions" wins.

I've finished the plan for the domain model, schema and core API layer. Nothing was edited.

Three findings change what was assumed:

- **Foreign keys are already on.** sqlx 0.9 sends `PRAGMA foreign_keys = ON` by default (`sqlx-sqlite-0.9.0/src/options/mod.rs:187`). `db.rs` therefore enforces them on both pools without any code; a test should pin this.
- **WAL is not on.** sqlx sets no `journal_mode` unless asked, and the default `synchronous` is FULL.
- **The SQLite is new enough.** sqlx's `sqlite` feature includes `sqlite-bundled`, which ships SQLite 3.51.3. STRICT tables, `RETURNING`, upsert, the JSON functions and partial indexes all work.

## Assumptions

- Assumption: the existing `tracker` module (and `src/features/tracker/`) is the competitive-programming domain. Problems, submissions and so on are submodules inside it, so papers and habits become sibling domains later.
- Assumption: the HTTP sync adapters belong to another planner. They call `import_submissions`, which is core's single entry point for synced data.
- Assumption: the resurfacing planner owns the scheduling algorithm. I only reserve the tables it needs.
- Assumption: `#[derive(sqlx::FromRow)]` on private row structs is allowed. It is a derive macro, not a compile-time-checked query macro, and is exported by the existing `macros` feature.
- Assumption: adding `serde_json` 1.0.154 to `tracker-core` is acceptable. It is already in `Cargo.lock` through sqlx-core and tauri. It is used for typed activity payloads and for binding id lists via `json_each`. It needs a line in `docs/decisions.md`.
- Assumption: timestamps cross the boundary as Unix epoch milliseconds (`i64`) going in and ISO strings coming out. SQL converts them with `strftime('%Y-%m-%dT%H:%M:%fZ', ?/1000.0, 'unixepoch')`, so no chrono or time crate is needed.
- Assumption: a problem's `external_id` is an opaque string that each adapter defines. For Codeforces it is `"{contestId}/{index}"`, e.g. `1950/C`.

## 1. Migrations (all new tables are STRICT)

Shorthand used below:

- **NOW** means `DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))`, written out in full in each file.
- **ISO(x)** means `CHECK (x GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')`. It keeps the width fixed so text sorting matches time order.
- `updated_at` is set explicitly in every UPDATE; there are no triggers.
- The timestamps in the file names are illustrative. Use the real commit time, strictly increasing.

**`20261125090000_create_judges_and_verdicts.sql`**

```sql
CREATE TABLE judges (
  slug       TEXT PRIMARY KEY CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'),
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  base_url   TEXT,
  created_at TEXT NOT NULL NOW
) STRICT;
INSERT INTO judges (slug, name, base_url) VALUES
  ('codeforces','Codeforces','https://codeforces.com'),
  ('atcoder','AtCoder','https://atcoder.jp');
-- Lookup table, not a CHECK: adding a verdict later is an INSERT, not a SQLite table rebuild.
CREATE TABLE verdicts (key TEXT PRIMARY KEY) STRICT;
INSERT INTO verdicts (key) VALUES ('accepted'),('wrong'),('time'),('memory'),('runtime'),('compile'),('pending'),('other');
```

Whether a judge can sync is decided by which adapters exist in Rust, not by a column.

**`20261125090100_create_problems.sql`**

```sql
CREATE TABLE problems (
  id            INTEGER PRIMARY KEY,
  judge         TEXT NOT NULL REFERENCES judges(slug),
  external_id   TEXT NOT NULL CHECK (length(trim(external_id)) > 0),
  contest_id    TEXT,
  problem_index TEXT,
  name          TEXT NOT NULL CHECK (length(trim(name)) > 0),
  url           TEXT,
  rating        INTEGER CHECK (rating IS NULL OR rating >= 0), -- judge's own scale
  notes         TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL NOW,
  updated_at    TEXT NOT NULL NOW,
  UNIQUE (judge, external_id),
  UNIQUE (id, judge)              -- parent key for the submissions composite FK
) STRICT;
```

**`20261125090200_create_submissions.sql`**

```sql
CREATE TABLE submissions (
  id           INTEGER PRIMARY KEY,
  problem_id   INTEGER NOT NULL,
  judge        TEXT NOT NULL,
  external_id  TEXT CHECK (external_id IS NULL OR length(trim(external_id)) > 0),
  source       TEXT NOT NULL CHECK (source IN ('sync','manual','import')),
  verdict      TEXT NOT NULL REFERENCES verdicts(key),
  raw_verdict  TEXT,               -- judge's string, kept verbatim
  language     TEXT,
  submitted_at TEXT NOT NULL ISO(submitted_at),
  time_ms      INTEGER CHECK (time_ms IS NULL OR time_ms >= 0),
  memory_bytes INTEGER CHECK (memory_bytes IS NULL OR memory_bytes >= 0),
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL NOW,
  updated_at   TEXT NOT NULL NOW,
  FOREIGN KEY (problem_id, judge) REFERENCES problems(id, judge) ON DELETE CASCADE,
  CHECK (source <> 'sync' OR external_id IS NOT NULL),
  UNIQUE (judge, external_id)    -- idempotent upsert; NULLs (manual) are distinct
) STRICT;
CREATE INDEX submissions_problem_time ON submissions (problem_id, submitted_at);
CREATE INDEX submissions_time ON submissions (submitted_at);
```

Manual attempts are ordinary submission rows with `source='manual'` and `external_id` NULL. There is no separate table, so status, analytics and review read one source.

**`20261125090300_create_tags_and_topics.sql`**

```sql
CREATE TABLE topics (
  slug TEXT PRIMARY KEY CHECK (slug NOT GLOB '*[^a-z0-9-]*'),
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL NOW
) STRICT;
CREATE TABLE judge_tags (           -- raw platform tags
  id INTEGER PRIMARY KEY,
  judge TEXT NOT NULL REFERENCES judges(slug),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL NOW,
  UNIQUE (judge, name)
) STRICT;
CREATE TABLE judge_tag_topics (     -- raw tag -> normalized topics, many-to-many
  tag_id INTEGER NOT NULL REFERENCES judge_tags(id) ON DELETE CASCADE,
  topic  TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, topic)
) STRICT, WITHOUT ROWID;
CREATE TABLE problem_tags (
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES judge_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (problem_id, tag_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX problem_tags_tag ON problem_tags (tag_id);
CREATE TABLE problem_topics (       -- owner overrides: 1 adds a topic, 0 hides a derived one
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  topic      TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
  assigned   INTEGER NOT NULL CHECK (assigned IN (0,1)),
  created_at TEXT NOT NULL NOW,
  PRIMARY KEY (problem_id, topic)
) STRICT, WITHOUT ROWID;
CREATE INDEX problem_topics_topic ON problem_topics (topic);
```

A problem's topics are the topics derived from its tags, plus overrides with `assigned=1`, minus overrides with `assigned=0`.

**`20261125090400_seed_topics_and_codeforces_tags.sql`** contains only inserts. It covers the topic list (greedy, dp, math, graphs, trees, strings, data-structures, ...), the fixed Codeforces tag list, and the tag-to-topic map, e.g. `'dfs and similar'` maps to graphs and dfs-bfs. Mapping changes later are new insert-only migrations or owner edits.

**`20261125090500_create_review_state.sql`** reserves the shape for the resurfacing planner:

```sql
CREATE TABLE review_state (
  problem_id       INTEGER PRIMARY KEY REFERENCES problems(id) ON DELETE CASCADE,
  scheduler        TEXT NOT NULL,                       -- algorithm id+version, e.g. 'fixed-v1'
  state            TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(state)),
  due_at           TEXT,                                -- NULL = not scheduled
  suspended        INTEGER NOT NULL DEFAULT 0 CHECK (suspended IN (0,1)),
  last_reviewed_at TEXT,
  created_at TEXT NOT NULL NOW,
  updated_at TEXT NOT NULL NOW
) STRICT;
CREATE INDEX review_state_due ON review_state (due_at) WHERE suspended = 0 AND due_at IS NOT NULL;
CREATE TABLE review_events (
  id            INTEGER PRIMARY KEY,
  problem_id    INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  outcome       TEXT NOT NULL,                          -- vocabulary owned by the scheduler
  details       TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(details)),
  reviewed_at   TEXT NOT NULL NOW
) STRICT;
CREATE INDEX review_events_problem ON review_events (problem_id, reviewed_at);
```

**`20261125090600_index_activity_log.sql`** adds `CREATE INDEX activity_log_created ON activity_log (created_at);` and `CREATE INDEX activity_log_kind_created ON activity_log (kind, created_at);` for streaks and habits.

Other SQLite points:

- In `open()` only, set `.journal_mode(SqliteJournalMode::Wal).synchronous(SqliteSynchronous::Normal)`. This lets UI reads run during a sync write. Note in decisions that `kintsugi.db-wal` and `-shm` sit next to the file, so a backup must copy them or checkpoint first.
- `journal_mode` has to be set in the connection options, not in a migration, because sqlx runs each migration inside a transaction.
- The existing tests assert `applied_migrations == 1` and will break. Add `pub fn migration_count() -> usize` (built on `MIGRATOR.iter().count()`) and assert against it.
- No table name blocks papers or habits. Activity kinds are namespaced (`tracker.*`).

## 2. Verdict model

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Verdict {
  #[serde(rename="accepted")] Accepted, #[serde(rename="wrong")] WrongAnswer,
  #[serde(rename="time")] TimeLimit,    #[serde(rename="memory")] MemoryLimit,
  #[serde(rename="runtime")] RuntimeError, #[serde(rename="compile")] CompileError,
  #[serde(rename="pending")] Pending,   #[serde(rename="other")] Other,
}
impl Verdict {
  pub fn as_str(self) -> &'static str;
  pub fn from_db(s: &str) -> Result<Self>;      // unknown string -> Error::Validation
  pub fn counts_as_failure(self) -> bool;        // Wrong|Time|Memory|Runtime
  pub fn is_final(self) -> bool;                 // !Pending
  pub fn from_codeforces(raw: Option<&str>) -> Self;
  pub fn from_atcoder(raw: &str) -> Self;
}
```

The serialized keys match the VerdictBadge keys on the design-system branch exactly.

Codeforces mapping:

| Raw verdict                                                                   | Maps to      |
| ----------------------------------------------------------------------------- | ------------ |
| `OK`                                                                          | Accepted     |
| `WRONG_ANSWER`, `PRESENTATION_ERROR`, `PARTIAL`, `CHALLENGED`, `REJECTED`     | WrongAnswer  |
| `TIME_LIMIT_EXCEEDED`, `IDLENESS_LIMIT_EXCEEDED`                              | TimeLimit    |
| `MEMORY_LIMIT_EXCEEDED`                                                       | MemoryLimit  |
| `RUNTIME_ERROR`, `SECURITY_VIOLATED`                                          | RuntimeError |
| `COMPILATION_ERROR`                                                           | CompileError |
| `TESTING` or no verdict                                                       | Pending      |
| `SKIPPED`, `FAILED`, `CRASHED`, `INPUT_PREPARATION_CRASHED`, anything unknown | Other        |

AtCoder mapping:

| Raw verdict                | Maps to      |
| -------------------------- | ------------ |
| `AC`                       | Accepted     |
| `WA`, `OLE`                | WrongAnswer  |
| `TLE`                      | TimeLimit    |
| `MLE`                      | MemoryLimit  |
| `RE`                       | RuntimeError |
| `CE`                       | CompileError |
| `WJ`, `WR`, "n/m" progress | Pending      |
| `IE`, unknown              | Other        |

`raw_verdict` is always stored.

**Repaired is a derived problem state, not a stored verdict.** A verdict is a fact the judge reports about one submission. Repaired is a fact about a problem's history ("failed, then later Accepted", per `docs/design-system.md`). Storing it would go stale whenever:

- an older failed submission arrives in a later sync,
- a hack flips an AC to CHALLENGED,
- a manual attempt is deleted.

```rust
#[serde(rename_all="camelCase")] pub enum ProblemStatus { Untried, Pending, Failed, Solved, Repaired }
```

It is computed by one SQL CTE in `problems.rs`. The failure list is generated from `counts_as_failure`.

- `first_ac` is the earliest Accepted (ties broken by id). `first_fail` is the earliest failure.
- **Repaired:** `first_fail < first_ac`.
- **Solved:** there is an AC but no earlier failure.
- **Failed:** there is a final non-AC submission.
- **Pending:** the only submissions are pending.
- **Untried:** no submissions.

## 3. Module layout and API

```
crates/core/src/
  activity/mod.rs   (cross-domain log; habits will use it)
  tracker/{mod.rs, verdict.rs, judges.rs, problems.rs, submissions.rs, topics.rs, review.rs}
  time.rs           (pub(crate) SQL fragments: NOW, FROM_EPOCH_MS)
```

`analytics`/`stats` is left to the analytics planner. Its input is a `pub(crate)` effective-topics CTE from `topics.rs`.

Public functions take `&Pool`, open a transaction with `pool.begin()`, and call `pub(crate)` helpers that take `&mut SqliteConnection` (passed as `&mut *tx`). Every type that crosses to the frontend uses `#[serde(rename_all="camelCase")]`.

```rust
// judges
pub struct Judge { slug: String, name: String, base_url: Option<String>, created_at: String }
pub struct NewJudge { slug: String, name: String, base_url: Option<String> }
pub async fn list_judges(pool: &Pool) -> Result<Vec<Judge>>;
pub async fn add_judge(pool: &Pool, new: NewJudge) -> Result<Judge>;           // Validation (slug format/duplicate)

// problems
pub struct NewProblem { judge: String, external_id: String, name: String, url: Option<String>,
                        rating: Option<i64>, contest_id: Option<String>, problem_index: Option<String> }
pub struct ProblemSummary { id: i64, judge: String, external_id: String, name: String, url: Option<String>,
  rating: Option<i64>, status: ProblemStatus, attempts: i64, first_failed_at: Option<String>,
  first_accepted_at: Option<String>, last_submitted_at: Option<String>, topics: Vec<String> }
pub struct ProblemDetail { #[serde(flatten)] summary: ProblemSummary, notes: String,
  tags: Vec<String>, submissions: Vec<Submission> }
#[derive(Default, Deserialize)] pub struct ProblemFilter { judge: Option<String>,
  statuses: Vec<ProblemStatus>, topic: Option<String>, limit: Option<u32>, offset: Option<u32> }
pub async fn upsert_problem(pool: &Pool, new: NewProblem) -> Result<i64>;
pub async fn get_problem(pool: &Pool, id: i64) -> Result<ProblemDetail>;       // NotFound
pub async fn list_problems(pool: &Pool, filter: &ProblemFilter) -> Result<Vec<ProblemSummary>>;
pub async fn set_problem_notes(pool: &Pool, id: i64, notes: &str) -> Result<()>;
pub async fn delete_problem(pool: &Pool, id: i64) -> Result<()>;  // Validation if it has synced submissions
pub(crate) async fn statuses(conn: &mut SqliteConnection, ids: &[i64]) -> Result<HashMap<i64, ProblemStatus>>;
                                                    // ids bound as a JSON array via json_each(?)

// submissions
pub enum SubmissionSource { Sync, Manual, Import }   // camelCase
pub struct Submission { id: i64, problem_id: i64, judge: String, external_id: Option<String>,
  source: SubmissionSource, verdict: Verdict, raw_verdict: Option<String>, language: Option<String>,
  submitted_at: String, time_ms: Option<i64>, memory_bytes: Option<i64>, notes: String }
pub struct ImportedSubmission { external_id: String, problem: NewProblem, tags: Option<Vec<String>>,
  verdict: Verdict, raw_verdict: Option<String>, language: Option<String>, submitted_at_ms: i64,
  time_ms: Option<i64>, memory_bytes: Option<i64> }      // tags None = keep, Some = replace
pub struct ImportSummary { inserted: u32, updated: u32, unchanged: u32, problems_created: u32, repaired: Vec<i64> }
pub async fn import_submissions(pool: &Pool, judge: &str, batch: &[ImportedSubmission]) -> Result<ImportSummary>;
pub struct ManualAttempt { problem: NewProblem, verdict: Verdict, language: Option<String>,
  submitted_at_ms: i64, notes: String }                 // Deserialize; problem upserted by key
pub async fn log_manual_attempt(pool: &Pool, attempt: ManualAttempt) -> Result<Submission>;
pub async fn delete_manual_attempt(pool: &Pool, id: i64) -> Result<()>;   // Validation if not manual
pub async fn list_submissions(pool: &Pool, problem_id: i64) -> Result<Vec<Submission>>;
```

- **`import_submissions` is one transaction.** It upserts problems and tags. It looks up each submission by `(judge, external_id)` and then inserts, updates (verdict or other fields changed, e.g. pending to final) or skips. It compares statuses before and after for the problems it touched and logs.
- **`log_manual_attempt` rejects `Pending`, so `Other` is allowed by default.** If `Other` should also be rejected for hand-logged attempts, say so.

```rust
// topics
pub struct Topic { slug: String, name: String }
pub async fn list_topics(pool: &Pool) -> Result<Vec<Topic>>;
pub async fn set_problem_topic(pool: &Pool, problem_id: i64, topic: &str, assigned: Option<bool>) -> Result<()>; // None clears
pub async fn map_tag(pool: &Pool, judge: &str, tag: &str, topic: &str, mapped: bool) -> Result<()>;
pub async fn list_unmapped_tags(pool: &Pool) -> Result<Vec<(String, String)>>;
pub(crate) async fn replace_problem_tags(conn: &mut SqliteConnection, problem_id: i64, judge: &str, tags: &[String]) -> Result<()>;

// review (shape only; final API is the resurfacing planner's)
pub struct ReviewState { problem_id: i64, scheduler: String, state: serde_json::Value,
  due_at: Option<String>, suspended: bool, last_reviewed_at: Option<String> }
pub async fn get_review_state(pool: &Pool, problem_id: i64) -> Result<Option<ReviewState>>;
pub(crate) async fn put_review_state(conn: &mut SqliteConnection, s: &ReviewState) -> Result<()>;

// activity
pub(crate) async fn record<P: Serialize>(conn: &mut SqliteConnection, kind: ActivityKind, payload: &P) -> Result<i64>;
pub struct ActivityEntry { id: i64, kind: String, payload: serde_json::Value, created_at: String }
pub async fn list_activity(pool: &Pool, since: Option<&str>, limit: u32) -> Result<Vec<ActivityEntry>>;
```

**Errors** (additions to `error.rs`):

```rust
#[error("{entity} not found: {key}")] NotFound { entity: &'static str, key: String },
#[error("invalid {field}: {reason}")] Validation { field: &'static str, reason: String },
#[error("serialization error: {0}")] Serialization(#[from] serde_json::Error),
```

Unique, foreign-key or CHECK violations on user input are caught at the call site, via `as_database_error()` and `is_unique_violation()` / `is_foreign_key_violation()` / `is_check_violation()`, and returned as `Validation`.

**src-tauri:**

- `ErrorKind` gains `NotFound`, `Validation` and `Internal` (for `Serialization`).
- `CommandError` gains `#[serde(skip_serializing_if="Option::is_none")] field: Option<String>` so forms can highlight the bad field.
- `From<tracker_core::Error>` becomes a `match`.
- In `api.ts`, the `ApiErrorKind` union and `toApiError` add the new kinds.

## 4. Activity log

Rows are written in the same transaction as the change they record. The payload is a JSON object with camelCase keys and `"v": 1`, and always carries natural keys (`judge`, `externalId`) as well as ids.

| Kind                       | Payload                                                     | When                                         |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `tracker.problem.added`    | `{v, problemId, judge, externalId, source}`                 | Insert only, not update                      |
| `tracker.attempt.logged`   | `{v, submissionId, problemId, verdict}`                     | Manual attempt                               |
| `tracker.attempt.deleted`  | `{v, submissionId, problemId}`                              | Manual attempt deleted                       |
| `tracker.sync.imported`    | `{v, judge, inserted, updated, unchanged, problemsCreated}` | One per batch, only if something changed     |
| `tracker.problem.repaired` | `{v, problemId, submissionId}`                              | Status changes to Repaired (the gold moment) |
| `tracker.topic.overridden` | `{v, problemId, topic, assigned}`                           | Owner topic override                         |
| `tracker.review.*`         | defined by the resurfacing planner                          | —                                            |

Practice streaks should come from `submissions.submitted_at`, not from the log.

## 5. Tests

Unit tests (in-module):

- Verdict `as_str`/`from_db` round trip for every variant, plus unknown input giving an error.
- Serde keys equal the VerdictBadge keys.
- Every Codeforces and AtCoder raw string in the tables above, plus `None` and unknown strings.
- `counts_as_failure` truth table.

DB tests in `crates/core/tests/`, using `open_in_memory()`:

- **Infrastructure:** `PRAGMA foreign_keys` is 1 on the memory pool and on a file pool; `journal_mode` is `wal` on a file; the migration count matches.
- **Judges:** seeds exist; bad slug and duplicate return `Validation`.
- **Problems:**
  - Upsert is idempotent and returns the same id.
  - An update keeps the old `url`/`rating` when the new value is null.
  - Unknown judge and empty name return `Validation`.
  - `get_problem` on a missing id returns `NotFound`.
- **Submissions:**
  - Importing the same batch twice gives `unchanged=n`; pending to accepted counts as updated.
  - `submitted_at_ms` round-trips to the exact ISO string.
  - A cross-judge mismatch is rejected by the composite FK.
  - A sync submission without `external_id` fails the CHECK.
  - Deleting a problem cascades.
- **Status:**
  - Untried, Pending, Failed, Solved, Repaired.
  - AC then WA gives Solved; CE then AC gives Solved; an older WA imported later flips Solved to Repaired.
  - CHALLENGED after AC gives Failed; equal timestamps are broken by id.
- **Manual:** log creates the problem when missing; `Pending` is rejected; deleting a synced submission is rejected.
- **Topics:** derived topics, adding an override, hiding a derived topic, clearing an override; tag replacement; unmapped tags listed.
- **Activity:** each kind is written once with the expected payload; there is no `problem.added` on update; the repaired event fires exactly once.
- **Review:** `json_valid` CHECK; cascade on problem delete.
- **src-tauri:** a unit test for each error-kind mapping.

## 6. Commit and PR sequence

1. **DB hardening:** WAL and synchronous NORMAL; FK and WAL tests; `migration_count`; decisions lines.
2. **Errors:** `NotFound`/`Validation`/`Serialization`, `ErrorKind` and `field`, `api.ts` kinds plus tests. Add `serde_json` here, with its decisions line.
3. **Judges and verdicts:** migration, `verdict.rs` with its mapping tests, `judges.rs`.
4. **Problems and activity:** problems migration, `activity` module and indexes migration, `problems.rs` (without status yet).
5. **Submissions:** submissions migration, `submissions.rs` (import, manual, delete), status CTE, repaired event.
6. **Tags and topics:** tags/topics migration, seed migration, `topics.rs`, topics in `ProblemSummary`.
7. **Review:** `review_state` migration and accessors, agreed with the resurfacing planner first.

Each PR adds thin commands, their `api.ts` wrappers and mocked frontend tests only for functions the UI calls.

## Open questions for the owner

1. Should a Compile error count as a failure for Repaired? My default is no, matching Codeforces penalty rules.
2. Should WA followed by AC two minutes later in the same sitting count as Repaired? The design doc implies yes. The alternative is a minimum gap.
3. Can the design system add an `other` badge for Skipped and judge errors? Until then the UI needs a fallback.
4. Which judges should be seeded (Codeforces and AtCoder only, or also CSES and LeetCode)? And do you accept the proposed topic list?
5. Should manual attempts be allowed on judges that sync (e.g. off-site upsolving)? My default is yes.
6. Do manual attempts need a full time, or would a date be enough?

### Critical Files for Implementation

- /home/user/Kintsugi/crates/core/src/db.rs
- /home/user/Kintsugi/crates/core/src/error.rs
- /home/user/Kintsugi/crates/core/src/tracker/mod.rs
- /home/user/Kintsugi/src-tauri/src/error.rs
- /home/user/Kintsugi/src/lib/api.ts
