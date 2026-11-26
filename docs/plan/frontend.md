# Appendix D: Frontend screens, navigation and state

> Planner report, written 2026-11-25 by a read-only planning agent. Kept as written for its detail (SQL, signatures, test lists). Where it conflicts with another appendix, [README.md](README.md) section "Reconciled decisions" wins.

I read AGENTS.md, docs/decisions.md, src/lib/api.ts, the health machine/page/tests, eslint.config.js, the Tauri commands/capabilities, and the `origin/feat/design-system` diff (primitives, docs/design-system.md, App.tsx `?design=1`). Nothing was edited.

## 1. Screen inventory (v1)

The shell has a left nav (Today, Problems, Topics, Settings) and a sync indicator in the nav footer. Today is the home screen.

```
+-----------+---------------------------------------------+
| Kintsugi  | Today                       3 due · 1 done   |
| > Today   | +-----------------------------------------+ |
|   Problems| | > CF 1850A  Tricky Sum   WA  due 2d ago | |  <- cursor row
|   Topics  | |   AC abc301_d Bit Mask   TLE due today  | |
|   Settings| +-----------------------------------------+ |
|           | [1 Solved] [2 Failed] [3 Skip] [4 Snooze]   |
| Synced 5m | status: "Marked 1850A solved. 2 left."      |
| [sync]    | Empty: "Nothing due. Next review tomorrow." |
+-----------+---------------------------------------------+
Problems:  [Judge v][Status v][Topic v][Search____]   142 problems
           ID | Name(button) | Rating | Topics | Status badge | Tries | Last
Problem:   < Back   CF 1850A Tricky Sum  [Repaired]  rating 800  dp, greedy
           Next review: 3 Dec   URL (copy)
           Submissions table: when | verdict | lang | time | mem
Topics:    Topic | solve-rate bar (gold = repaired share) | n | weakness
           (low-sample rows muted, sorted last; click a row -> Problems filtered)
Settings:  Accounts: list (judge, handle, last synced, [Remove]) + add form
           Preferences: theme, daily review limit, sync on launch
           About: health card (the existing HealthPage content)
```

Deferred: charts over time and heatmaps, undo for review actions, notes, contest view, command palette, bulk actions, scheduler tuning, auto-sync timer and tray, the paper queue and habits, and an "open on judge" button (it needs the opener plugin, which was removed; see the open questions).

## 2. Navigation: hand-rolled, no router

I recommend a `navReducer` in `src/features/shell/navMachine.ts`. Reasons:

- A desktop app has no URLs, deep links or address bar.
- A router adds a dependency and a second source of state that the reducer pattern can't own or test purely.
- Back-navigation is just a stack.

```ts
type View =
  | { name: "today" }
  | { name: "problems"; filters: ProblemFilters }
  | { name: "problem"; problemId: string }
  | { name: "topics" }
  | { name: "settings"; section: "accounts" | "preferences" | "about" };
type NavState = { view: View; back: View[] }; // stack capped at ~20
type NavEvent =
  | { type: "navigate"; view: View } // pushes the current view
  | { type: "replace"; view: View } // e.g. filter changes, no push
  | { type: "back" };
```

Problems calls `onFiltersChange` and the shell dispatches `replace`. So Back from detail brings the filters back without the screen keeping them.

`?design=1` stays as it is: a check in App.tsx before the shell, dev only. The fixed bottom-right "Design system (dev)" link will cover screen content (Today's action bar), so it should move into the nav footer.

## 3. State per screen

The shell holds one `useReducer(appReducer)` built from smaller reducers: `{ nav, sync, settings, dataVersion }`. Screens get plain props `{ dataVersion, onNavigate, ... }`. The tree is one level deep, so no context is needed.

Shared rules:

- **Request ids.** Every load and mutation in flight carries a `requestId` in state. Result events echo it, and the reducer ignores mismatches. This extends health's "ignore stale results" to filter races.
- **Refresh after sync.** When a sync finishes with new submissions, the shell increments `dataVersion`. Each screen has `useEffect(() => dispatch({type:"refresh"}), [dataVersion])`. `refresh` from `ready` keeps the current rows and sets `refreshing: true`, so the screen doesn't flicker.
- **Review actions are not optimistic.** SQLite is local and responds in milliseconds, so rollback logic isn't worth it. The row shows busy, the action buttons are disabled, and on success the row is removed and the cursor moves on. On failure the row stays and an inline alert shows.
- **StrictMode** runs effects twice only on first mount. Mutations are therefore always started by a dispatched event, never by the initial state. Sync-on-launch is dispatched after settings load.

```ts
// sync (shell)
type SyncState =
  | { status: "unknown" }                          // effect: lastSyncResult()
  | { status: "idle"; last: SyncResult | null }
  | { status: "running"; requestId: number; progress: SyncProgress | null; last: SyncResult | null } // effect: startSync(onProgress)
  | { status: "failed"; error: ApiError; last: SyncResult | null };
type SyncEvent = { type: "lastLoaded"; last } | { type: "start" } | { type: "progressed"; requestId; progress }
  | { type: "finished"; requestId; result } | { type: "failed"; requestId; error };
// `start` while running is ignored.

// Today
type TodayState =
  | { status: "loading"; requestId: number }      // effect: reviewQueue()
  | { status: "failed"; error: ApiError }
  | { status: "ready"; items: ReviewItem[]; cursor: number; refreshing: boolean;
      pending: { requestId: number; problemId: string; outcome: ReviewOutcome } | null; // effect: recordReview()
      actionError: ApiError | null; lastAction: string | null };  // lastAction feeds the live region
type TodayEvent = loaded | loadFailed | retry | refresh | move(delta) | select(index)
  | act(outcome) | actSucceeded(requestId) | actFailed(requestId, error);

// Problems
type ProblemsState = { filters: ProblemFilters; requestId: number;
  list: { status: "loading"; previous: ProblemSummary[] | null }  // effect: listProblems(filters), 200ms debounce when the search text changed
      | { status: "ready"; rows: ProblemSummary[]; total: number }
      | { status: "failed"; error: ApiError } };
// Events: filterChanged(partial) -> new requestId + loading; loaded; failed; refresh

// Problem detail: loading(id) -> ready{detail} | notFound | failed. Effect on loading: getProblem(id).

// Topics: loading | ready{topics, sort: "weakness"|"solveRate"|"name"} | failed.
// Sorting is a pure selector, not stored as derived rows.

// Settings: two machines.
// accounts: loading | ready{accounts, form:{judge,handle,error}, adding, removing:id|null, confirmRemove:id|null} | failed
// prefs:    loading | ready{settings, saving} | failed. On save success: applyTheme() and report up to the shell.
```

Pure helpers go beside each machine: `validateHandle`, `formatRelative(iso, now)` (the clock is a 60s interval in the component, never in the reducer), `keyToEvent`, `toBadgeVerdict`, `sortTopics`.

## 4. src/lib/api.ts additions

```ts
export type Judge = "codeforces" | "atcoder";
export type Account = { id: number; judge: Judge; handle: string; addedAt: string; lastSyncedAt: string | null };
export type ProblemStatus = "solved" | "repaired" | "unsolved";
export type SubmissionVerdict = "accepted"|"wrong"|"time"|"memory"|"runtime"|"compile"|"pending"|"other";
export type ProblemSummary = { id: string; judge: Judge; code: string; name: string; rating: number | null;
  topics: string[]; status: ProblemStatus; attempts: number; lastAttemptAt: string; nextReviewAt: string | null };
export type Submission = { id: string; submittedAt: string; verdict: SubmissionVerdict; rawVerdict: string;
  language: string; timeMs: number | null; memoryKb: number | null };
export type ProblemDetail = ProblemSummary & { url: string; submissions: Submission[] };
export type ProblemFilters = { judge: Judge | null; status: ProblemStatus | null; topic: string | null; search: string };
export type ReviewItem = { problem: ProblemSummary; dueAt: string; lastVerdict: SubmissionVerdict };
export type ReviewOutcome = { kind: "solved" | "failed" | "skip" } | { kind: "snooze"; days: number };
export type TopicStat = { topic: string; attempted: number; solved: number; repaired: number;
  solveRate: number; weakness: number; lowSample: boolean };
export type Settings = { theme: "system" | "light" | "dark"; dailyReviewLimit: number; syncOnLaunch: boolean };
export type SyncProgress = { judge: Judge; handle: string; fetched: number; total: number | null };
export type SyncResult = { finishedAt: string; accounts: { accountId: number; ok: boolean; newSubmissions: number; error: string | null }[] };

listAccounts(); addAccount(judge, handle); removeAccount(id);
startSync(onProgress: (p: SyncProgress) => void): Promise<SyncResult>; lastSyncResult(): Promise<SyncResult | null>;
listProblems(filters); getProblem(id); reviewQueue(); recordReview(problemId, outcome);
topicStats(); getSettings(); updateSettings(settings);
```

Tauri 2 converts command argument names to camelCase on the JS side, so the wrappers pass `{ problemId }`.

**Sync progress.** I recommend a Tauri 2 `Channel`. It comes from `@tauri-apps/api/core`, so it stays inside api.ts with no new import, and it is ordered and scoped to the one call. `startSync` creates the channel, sets `onmessage` to the callback, and resolves with the final `SyncResult`. Events (`listen`) are only needed if the backend starts syncs on its own (on a timer or at launch). In that case, add `onSyncProgress(handler): () => void` to api.ts. The wrapper must handle the race where cleanup runs before `listen` resolves: if the component unmounts first, call unlisten as soon as it arrives.

**ESLint gap.** The rule blocks only `@tauri-apps/api/core`. The `@tauri-apps/api` root re-exports `core` (so `import { core } from "@tauri-apps/api"` passes), and `/event`, `/window` and `/mocks` aren't blocked either. Tighten it with `patterns: [{ group: ["@tauri-apps/api", "@tauri-apps/api/*", "@tauri-apps/plugin-*"] }]` so api.ts is the only Tauri boundary. This tightens the rule rather than loosening it. Update AGENTS.md and decisions.md to match.

**ApiErrorKind.** Replace the hard-coded check with `const apiErrorKinds = ["databaseUnavailable","database","notFound","invalidInput","network","judgeApi","syncInProgress"] as const`, use `includes` in `toApiError`, and keep `"unknown"` as the fallback. Mirror these kinds in Rust's `ErrorKind`. A test lists them; codegen (ts-rs or specta) is deferred.

## 5. Charts

No chart dependency in v1. Topics is a `Table` (the numbers are the accessible data). The bar cell is an `aria-hidden` div:

- solve-rate fill in `--accent`, with the repaired share as an `--accent-gold` segment (design-system.md already reserves this use);
- the percentage as text next to it.

Add a small `Meter` primitive to src/ui. Sync progress can reuse it when `total` is known. Revisit a library only if trends over time land.

## 6. Tests

- **Reducers:** every transition. Events in the wrong state return the same reference (`toBe`). Stale `requestId` results are ignored. Cover cursor clamping after a removal and `start` being ignored while a sync runs.
- **Pure helpers:** `keyToEvent` (ignored inside inputs or with modifier keys), `formatRelative` with a fixed `now`, `validateHandle`, `sortTopics`, `toBadgeVerdict`.
- **Components:** use the HealthPage pattern, `vi.mock("../../lib/api", importOriginal)`. Per screen, test:
  - loading then ready;
  - error shows an alert, and retry works;
  - an action calls its wrapper with exact arguments (`toHaveBeenCalledWith`);
  - keyboard via `fireEvent.keyDown` (no `user-event` dependency).
- **Sync:** the mocked `startSync` captures `onProgress`, so the test drives progress by hand.
- **New `src/lib/api.test.ts`:** mock `invoke` with `vi.hoisted` plus `vi.mock("@tauri-apps/api/core", ...)`. That needs no import statement, so the lint rule still holds. Assert command names, argument shapes and `toApiError` mapping.
- **Shell test:** nav switching, Back, the sync indicator, and the `dataVersion` refetch.

## 7. Accessibility and keyboard

- **Nav:** `<nav aria-label="Main">` with buttons and `aria-current="page"`.
- **Global shortcuts:** Ctrl+1 to Ctrl+4 switch views; Alt+Left and mouse button 4 go Back.
- **Focus on view change:** focus moves to the screen's `h1` (`tabIndex={-1}`). There is one `h1` per screen, as design-system.md says.
- **Today shortcuts:**
  - Up/Down or J/K move the cursor; Enter opens the problem.
  - 1, 2, 3 and 4 are Solved, Failed, Skip and Snooze (1 day).
  - Buttons show the key with `<kbd>`.
  - One `keydown` listener lives in an effect, and the mapping is the pure `keyToEvent`.
  - Keys are ignored inside inputs and selects, and while an action is pending.
- **After an action:** focus goes to the next row, or to the empty state when the queue is done. A `role="status"` region announces "Marked X solved. N left."
- **Sync indicator:** it announces only start, finish and failure. The progress text sits in a region that is not live, so it isn't read out on every tick.
- **Removing an account:** an inline confirm, since there is no Dialog primitive.

## 8. Changes to the design-system branch

1. `Tabs` mounts every panel's content (hidden). Panels with their own machines would all fetch at once. Add a render-only-selected option, and don't use `Tabs` for the main nav.
2. `Table` has no row activation and no sortable headers (`aria-sort`). For v1, put a button in the Name cell; add sorting later.
3. `VerdictBadge` can't show judge verdicts outside its seven, such as CF CHALLENGED, SKIPPED, IDLENESS and OUTPUT limit, or AtCoder OLE and IE. Add an `other` kind that shows the raw label.
4. Missing icons: nav (today, list, topics, gear), external-link, skip, plus, trash. Missing primitives: Meter, Kbd, an inline Alert (HealthPage builds its own error line).
5. `applyTheme` isn't persisted. The theme lives in settings, and the shell applies it after `getSettings`, so the system theme may flash briefly at launch (see the questions).
6. Move the dev link into the nav footer (section 2).

## 9. PR sequence (each passes the done gate)

The frontend for each feature lands with or after its backend command. Inside each PR, commit in this order: types and wrapper with the api test, then machine with tests, then screen with tests, then shell wiring.

1. Tighten ESLint and refactor the error kinds (no behavior change).
2. Design-system follow-ups from section 8.
3. Shell: navMachine, sidebar, placeholder screens with `EmptyState`, Health moved to Settings > About, keyboard nav.
4. Settings: accounts and preferences, plus theme persistence.
5. syncMachine, indicator, `startSync` Channel, `dataVersion`, sync on launch.
6. Problems list.
7. Problem detail.
8. Today queue, review actions, shortcuts, live region.
9. Topics with Meter bars.
10. Pass on first-run empty states and focus.

Assumption: the frontend starts every sync, so a Channel is enough in v1. Assumption: problem ids are strings like `codeforces:1850A`, and dates are ISO UTC strings (per decisions.md). Assumption: the problem list is small enough (a few thousand rows) to fetch without pagination in v1. Assumption: the backend rejects a sync while one is already running (`syncInProgress`).

## Open questions for the owner

1. Is Today the home screen? Should it cap at the daily review limit or show everything due?
2. Should Snooze have a fixed duration (1 day) or offer a choice? Is undo needed in v1? Undo needs a backend command.
3. Should "Open on judge" come back? It needs `tauri-plugin-opener` plus a permission, and a decisions.md entry. Without it, v1 only offers copying the URL.
4. Is it fine to tighten the ESLint rule to every `@tauri-apps/*` import outside api.ts?
5. Do the feature folders go flat (`src/features/today/`, ...) or under the existing `src/features/tracker/` (.gitkeep)? AGENTS.md says one folder per domain.
6. May the theme be cached in localStorage to avoid a flash at launch, with the database still the source of truth?
7. Should sync run on launch by default?

### Critical Files for Implementation

- /home/user/Kintsugi/src/lib/api.ts
- /home/user/Kintsugi/eslint.config.js
- /home/user/Kintsugi/src/App.tsx (design branch version, `git show origin/feat/design-system:src/App.tsx`)
- /home/user/Kintsugi/src/features/health/healthMachine.ts (template for every machine)
- /home/user/Kintsugi/docs/decisions.md
