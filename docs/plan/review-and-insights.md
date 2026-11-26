# Appendix C: Resurfacing and weak topics

> Planner report, written 2026-11-25 by a read-only planning agent. Kept as written for its detail (SQL, signatures, test lists). Where it conflicts with another appendix, [README.md](README.md) section "Reconciled decisions" wins.

I read AGENTS.md, docs/decisions.md and the `crates/core` skeleton. The only existing table is `activity_log`, and `tracker/mod.rs` is empty. I edited nothing.

## 0. Architecture

Review state is never edited directly. A pure fold rebuilds it from two inputs: synced submissions and an append-only log of owner actions. The result is saved to a `review_state` table that is only a cache.

- **Why:** sync stays idempotent, a self-rating given late is handled correctly, and changing the algorithm later only means rebuilding the cache. No data migration is needed.
- **Code location:**
  - `crates/core/src/review/` holds `verdict.rs`, `attempt.rs`, `schedule.rs` and `queue.rs`.
  - `crates/core/src/insights/` holds `topics.rs`, `model.rs` and `bands.rs`.
- **Time:** times are `i64` unix seconds throughout. `now: i64` and `utc_offset_secs: i32` are always passed in as parameters.
  - The local day is `(t + offset).div_euclid(86400)`. This needs no chrono dependency.
  - The frontend sends `-new Date().getTimezoneOffset()*60`.
  - Only the `src-tauri` command reads the clock.

## 1. Definitions and lifecycle

**Verdict classes** (`verdict.rs`):

- **Accepted:** CF `OK`, AtCoder `AC`.
- **Rejected:** WA, TLE, MLE, RE, PE, IDLENESS, OLE, CHALLENGED (hacked).
- **Ignored:** COMPILATION_ERROR/CE, SKIPPED, TESTING/WJ/WR, CRASHED, INPUT_PREPARATION_CRASHED, SECURITY_VIOLATED, REJECTED, IE, PARTIAL.
- Unknown strings are treated as Ignored and counted so they show up as a warning.

**Attempt:** a maximal run of one problem's non-ignored submissions where each comes within `SESSION_GAP = 4h` of the previous one. Submissions after the first AC in an attempt are dropped. Each attempt has one outcome:

- **Clean:** AC with at most `SLIP = 1` rejected submission before it in the attempt.
- **Struggled:** AC with 2 or more rejected submissions before it.
- **Failed:** no AC, at least one rejected submission.
- Any owner flag `editorial_assisted` on the attempt makes it Failed.

Assumption: one WA is a slip, not a failure. The defaults are N=2 and a 4h gap; both are settings.

**Failed problem:** a problem whose first attempt was Failed or Struggled, or that the owner flagged editorial-assisted. The flag also lets the owner start tracking a problem they solved cleanly.

**States** are `Untracked | Broken | Repaired | Mastered | Retired`. Broken carries a reason: `unsolved | hard_won | editorial`.

- **Broken:** failed, with no clean re-solve since the last failure.
- **Repaired:** at least one clean re-solve counted as a review since the last failure. Rendered in gold. `repaired_at` keeps the first repair permanently, so history stays gold.
- **Mastered:** passed the last step of the ladder. No longer scheduled.
- **Retired:** the owner chose "skip". Out of the queue but still counted in analytics.

**Transitions** (the fold in `schedule.rs`):

| From                      | Event                                       | To                                                                              |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Untracked                 | Clean attempt                               | Untracked                                                                       |
| Untracked                 | Failed/Struggled attempt, or editorial flag | Broken, step 0, due = end + I[0]                                                |
| Broken/Repaired           | Pass (on time)                              | step+1 (Easy rating: +2). Broken becomes Repaired. Past the last step: Mastered |
| Broken/Repaired           | Hard (Struggled, or owner rates Hard)       | same step, due = t + I[step], state unchanged                                   |
| any scheduled or Mastered | Fail (Failed or editorial)                  | Broken, step 0, lapses+1 if step > 0 or it was ever repaired                    |
| any                       | `snooze(until)`                             | due = max(due, until), state unchanged                                          |
| any                       | `skip` / `unskip`                           | Retired, or back to the state recomputed without the skip                       |
| any                       | `resolved_offline(rating)`                  | same as an attempt at `created_at` with outcome Pass/Hard                       |

**Early-review rule:** if a Pass happens with `elapsed < I[step]/2` since the last failure or review, it is practice, not a review. The step does not advance and due = t + I[step].

- A same-day or next-day upsolve therefore never counts as a repair automatically.
- An upsolve two or more days later, not flagged, counts as a repair. The editorial flag handles the case where the owner read the editorial first.
- An early Fail still counts as a Fail.

**Ratings:** the owner can rate an attempt Easy, Good or Hard, attached to its AC submission id. The default is Good.

## 2. Scheduling algorithm

**Options compared:**

- **SM-2:** each problem's ease factor needs many reviews to settle and drifts into "ease hell". A problem here gets only about 4–6 reviews in its whole life.
- **FSRS:** `fsrs` 7.0.0 is maintained by open-spaced-repetition, BSD-3-Clause, released 2026-11-10.
  - It pulls in ndarray, rayon, rand, rand_distr, wide, bytemuck, itertools and snafu.
  - Its default parameters model flashcard recall. Fitting your own needs hundreds to thousands of reviews, which you would reach in years at 1–5 per day.
  - A 20–90 minute re-solve is skill retrieval, not recall, and the signal is mostly binary.
  - `rs-fsrs` 1.2.1 has had no release since 2024-10, and crates.io lists its license as non-standard. Ruled out.
- **Leitner ladder:** easy to explain ("next in 30 days because you re-solved it cleanly twice"), deterministic, no dependency, easy to test.

**Recommendation for v1: a fixed ladder.**

- `I = [3, 10, 30, 90]` days. Passing the 90-day step means Mastered.
- That is 4 clean re-solves over about 4.5 months. At 1–5 reviews per day this keeps the load bounded.
- Overdue items get no bonus: a Pass advances one step as usual.
- FSRS can come later by adding `stability`/`difficulty` columns to the cache and swapping the fold.

**Daily queue** (`queue.rs`, `build_queue(states, now, offset, cap, done_today)`):

- **Candidates:** Broken or Repaired, with `due_at` at or before the end of the local day.
- **Order:** overdue ratio `(now − due_at)/I[step]` descending, then Broken before Repaired, then lower step, then problem id. This keeps the order deterministic.
- **Cap:** `max(cap − done_today, 0)`, with cap 3 by default and allowed 1–5. `done_today` counts review attempts (Pass, Hard or Fail on scheduled problems) whose time falls on today's local day.
- **Overdue items** stay in a backlog with no penalty. The UI shows "+N more due".
- **Counting a review:** a fresh AC on a scheduled problem counts through the fold, whether or not it was in today's queue. The early-review rule above still applies.

## 3. Weak topics

**Unit of data:** each problem's first attempt. Reviews would bias the result. The value `s` is Clean=1, Struggled=0.5, Failed or editorial=0.

**Model** (pure, `insights/model.rs`): one rating per topic, Elo-style, with a Bayesian prior.

- Expected solve probability: `p(T, r) = 1 / (1 + 10^((r − T)/400))`, where r is the problem rating.
- Recency weight: `w = 0.5^(age_days / 180)`, with `age_days = (now − t_attempt)/86400`.
- `T_topic` is the MAP estimate, found as the root of a function that decreases monotonically in T:
  `f(T) = c·Σ wᵢ(sᵢ − p(T, rᵢ)) − (T − L)/σ0²`, with `c = ln10/400` and `σ0 = 200`.
  - Bisection on [0, 4000], 60 iterations.
  - The prior pulls topics with little data toward the owner's level L. This handles small samples without a separate rule.
- Uncertainty: `SE = 1/sqrt(c²·Σ wᵢ p(1−p) + 1/σ0²)`. `n_eff = Σw`.
- **Owner level L:** the same solver run over all rated first attempts with a weak prior (σ0 = 400, centred on 1200). An optional setting overrides it, for example the current CF rating.
- **Output per topic:** `{topic, T, SE, n, n_eff, gap = L − T}`.
  - Sorted by `T + SE`, ascending.
  - A topic is "weak" if `T + SE < L − 50` and `n ≥ 3`.
  - Topics with `n < 3` are shown as "not enough data".
- Problems with several tags count fully under each topic, not split.

**Rating bands** (`bands.rs`): 200-wide bands, CF only. Each band shows n, clean rate and the 95% Wilson lower bound:
`(p̂ + z²/2n − z·sqrt(p̂(1−p̂)/n + z²/4n²)) / (1 + z²/n)`, with z = 1.96.
"Comfort ceiling" is the highest band whose lower bound is at least 0.5.

**Tag normalization:** a const table in Rust, `canonical_topic(platform, raw) -> Option<Topic>`, with about 20 topics:

| Topic           | CF tags                                        |
| --------------- | ---------------------------------------------- |
| graphs          | graphs, dfs and similar, shortest paths, 2-sat |
| data-structures | data structures, dsu                           |
| strings         | strings, hashing, string suffix structures     |
| combinatorics   | combinatorics, probabilities                   |
| number-theory   | number theory, chinese remainder theorem       |
| binary-search   | binary search, ternary search                  |
| brute-force     | brute force, meet-in-the-middle                |
| flows           | flows, graph matchings                         |
| algebra         | fft, matrices                                  |
| implementation  | implementation, expression parsing             |

- Kept as their own topics: math, greedy, dp, trees, two-pointers, sortings, bitmasks, constructive, geometry, games, divide-and-conquer, interactive.
- Dropped: `*special`, schedules.
- Unknown tags map to None and are counted under "unmapped tags".

**AtCoder:** in v1 it is resurfaced but left out of topic and band analytics. It has no tags, and its difficulty scale differs from CF's. Owner tagging comes in v2; the schema should allow it now (see §5). CF problems with no rating are also left out of the model.

**SQL vs Rust:**

- **SQL** only filters and joins. One query returns submissions with `(problem_id, submitted_at, verdict, platform)` ordered by problem and time. A second returns `(problem_id, rating, raw_tag)`, plus owner actions.
- **Rust, all pure:** verdict classes, grouping into attempts, outcomes, weights, the solver, Wilson bounds and the tag mapping.
- **Size:** a few thousand rows is cheap. Attempts can be cached later if needed.

## 4. "Practice next" (v1, minimal)

- For the top 2 weak topics, suggest a target range `[round100(T), round100(T)+200]`.
- Link to the CF problemset filter, e.g. `https://codeforces.com/problemset?tags=dp,1400-1600`. Assumption: CF accepts a rating range in `tags`.
- No problem catalogue is needed.
- **Deferred:**
  - choosing specific unsolved problems (needs a `problemset.problems` catalogue sync);
  - AtCoder suggestions;
  - splitting the daily budget between reviews and new problems;
  - spreading the load of failures that arrive in bursts after a contest.

## 5. Fields I need from the schema owner

- **problem:** `id`, `platform`, `contest_id`, `index`, `name`, `url`, `rating INTEGER NULL`, `difficulty_source` (`cf_rating` | `atcoder_problems`).
- **problem_tag:** `(problem_id, raw_tag, source 'judge'|'owner')`.
- **submission:** platform submission id (unique per platform), `problem_id`, `submitted_at INTEGER` (unix seconds), raw `verdict TEXT`. Optional: `participant_type`. Index on `(problem_id, submitted_at)`.
- **owner_action** (append-only):
  - `id`, `problem_id`, `kind`, `target_submission_id NULL`, `until_at NULL`, `rating NULL`, `created_at INTEGER`.
  - `kind` is one of `editorial_assisted | rate | resolved_offline | snooze | skip | unskip`.
  - Each action is also written to `activity_log` for habits.
- **review_state** (cache that can be rebuilt):
  - `problem_id PK`, `state`, `broken_reason`, `step`, `interval_days`, `due_at NULL`, `last_reviewed_at`, `failed_at`, `repaired_at NULL`, `mastered_at NULL`, `lapses`, `reviews`, `computed_at`.
  - Index on `(state, due_at)`.
  - No ease or stability columns in v1.
- **settings:** `daily_cap`, `struggle_threshold`, `session_gap_secs`, `level_override NULL`.

## 6. Tests (all with a fixed `now`)

**Unit tests, in their modules:**

- Verdict mapping covers every CF and AtCoder string, and unknown strings.
- Attempt grouping:
  - gap exactly 4h vs 4h+1s;
  - submissions after AC dropped;
  - CE-only produces no attempt;
  - the SLIP boundary (1 vs 2 WA).
- Fold:
  - each transition in the table;
  - an early pass does not advance;
  - an upsolve the same day stays Broken;
  - a clean upsolve on day 2 becomes Repaired;
  - Easy jumps 2 steps;
  - Hard keeps the step;
  - a Fail resets and counts a lapse;
  - Mastered after step 3;
  - a fail after Mastered;
  - snooze never moves due earlier;
  - skip then unskip restores the state;
  - a late rating changes the outcome;
  - the fold is idempotent: replaying twice gives the same result.
- Queue:
  - the boundary at the end of the local day, with negative and positive offsets;
  - order by overdue ratio, with a deterministic tiebreak;
  - the cap minus `done_today`;
  - Retired and Mastered excluded.
- Model:
  - `p(L, L) = 0.5`;
  - no data gives T = L;
  - all solves gives T > L, all failures gives T < L;
  - the prior pulls toward L, with more pull for smaller n;
  - the recency weight halves at 180 days;
  - bisection converges to within 1;
  - SE shrinks as n grows.
- Wilson: known values (n=0, p̂=1 with n=5), checked against hand-computed results.
- Tags: every CF tag listed is mapped or explicitly dropped; unknown tags give None.

**DB tests** in `crates/core/tests/` with `open_in_memory()`:

- Rebuilding the cache from seeded submissions and actions, and rebuilding again gives the same result.
- Queue query end-to-end.
- Topic report end-to-end.

**Frontend:** reducer tests for the queue and insights screens, and component tests that mock the `api.ts` wrappers.

## 7. Commit and PR sequence

Each PR passes the done gate.

1. `review/verdict.rs` and `attempt.rs`, with unit tests.
2. `schedule.rs`: the ladder, the fold, and the outcome and state types, with transition tests.
3. `queue.rs`, with tests.
4. Migration for `owner_action`, `review_state` and settings (after the schema owner's tables land). Rebuild function plus DB tests.
5. Tauri commands `review_queue` and `record_owner_action`, `api.ts` wrappers, and a queue screen reducer with tests.
6. `insights/topics.rs` (tag mapping), with tests.
7. `insights/model.rs` (solver, SE, level), with tests.
8. `insights/bands.rs` (Wilson), with tests.
9. Insights query, command, wrapper and screen, including practice-next links.
10. Entries in `docs/decisions.md`: the ladder over FSRS, the definitions and defaults, AtCoder excluded from analytics. No new dependencies.

## Assumptions

- Assumption: the owner solves alone in submission order. Running the fold on all data at every sync is fast enough, since there are fewer than 20k submissions.
- Assumption: the frontend's UTC offset is good enough for day boundaries; a DST edge can shift one day.
- Assumption: virtual and practice submissions count the same as contest ones.

## Open questions for the owner

1. Is 2 or more wrong answers before AC the right struggle threshold? Should TLE count the same as WA?
2. Should a plain clean upsolve 2 or more days after a failure count as a repair, or only re-solves done from the queue?
3. Is the ladder 3/10/30/90 days, with 4 re-solves to mastery, acceptable? Should mastered problems get a 180-day maintenance check?
4. Default daily cap of 3?
5. Should topic level use your live CF rating or be inferred from your solves?
6. AtCoder in analytics: tag problems manually in v2, or leave them out for good? Should the AtCoder difficulty scale be converted to CF?
7. Should "Repaired" stay gold after a later lapse? This plan keeps `repaired_at`.
