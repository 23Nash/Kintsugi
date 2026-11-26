---
name: orchestrate
description: Build every ready ticket on the GitHub board, across specs, with implementer, merger and explorer subagents, until the frontier is empty.
disable-model-invocation: true
---

You are the **orchestrator**. You drain the board: every `ready-for-agent` ticket whose blockers are closed gets built, merged into its spec's integration branch, and closed, until the **frontier** is empty. You assign work and move ticket state; the personas in `.claude/agents/` do the building. Why this skill exists instead of `implement-spec`: `docs/adr/0001-custom-orchestrator-over-implement-spec.md`.

Talk to subagents in **context pointers**: issue numbers, branch names, paths. Never paste a ticket or spec into a prompt.

## Board

- **Spec**: an open issue with sub-issues (`sub_issues_summary.total > 0` on the issue). Its integration branch is `spec/<slug>`, slug from the spec title.
- **Ticket**: a sub-issue of a spec.
- **Frontier**: open tickets labelled `ready-for-agent`, with no assignee and `issue_dependencies_summary.blocked_by == 0`.
- **Spec claim**: the `orchestrating` label on a spec. Work only specs this session claimed; a spec already labelled belongs to another session.
- All tracker commands: `docs/agents/issue-tracker.md` (REST `gh api` only).

## Steps

1. **Load.** Read `AGENTS.md`, `GLOSSARY.md` and `docs/adr/`. Set `TARGET` to `<absolute path of this checkout>/target`, the Cargo target directory every subagent shares.

2. **Claim specs.** Find specs with at least one frontier ticket and no `orchestrating` label. Add the label to each.

3. **Prepare each claimed spec.**
   - `git fetch origin`. If `origin/spec/<slug>` exists, create `spec/<slug>` from it; otherwise from `origin/main`. Leave it unchecked-out: mergers switch to it in their own worktrees.
   - If the spec has no `## Explorer notes` comment, start the `explorer` subagent with the spec number and wait for it.

4. **Fill slots.** Keep at most 2 `implementer` subagents running, in the background. For each free slot, take the lowest-numbered frontier ticket across claimed specs, assign it to `$(gh api user --jq .login)`, and start an implementer with: ticket number, spec number, `spec/<slug>`, `TARGET`.

5. **Handle each report** as it arrives:
   - `status: done`, `gate: pass` → start a `merger` (foreground, one at a time) with the ticket branch, `spec/<slug>`, `TARGET`.
     - `merged <sha>` → comment `Merged into spec/<slug> at <sha>` on the ticket, close it, run `git worktree remove` on the implementer's worktree, and delete the branch with `git update-ref -d refs/heads/ticket/<n>-<slug>` once `git merge-base --is-ancestor` confirms it is in `spec/<slug>`.
     - `conflict` → start a fresh implementer on the same ticket, told to check out the existing `ticket/<n>-<slug>`, merge the `spec/<slug>` tip into it, resolve, and pass the gate.
     - `gate-fail` → treat as an implementer gate failure.
   - Gate failure → one retry: a fresh implementer on the existing branch, given the failing step. A second failure is a **stop**.
   - `needs-owner` → **stop**.

   After every report, rescan the board (tickets may have been added or unblocked) and go back to step 4.

6. **Finish a spec** once all its tickets are closed:
   1. `git push origin spec/<slug>`.
   2. Call the Skill tool with `code-review` on `spec/<slug>` since its merge-base with `origin/main`. Post the findings as one `## Review findings` comment on the spec. If there are any, start one implementer pointed at that comment instead of a ticket, then a merger. Findings still open after that round are a **stop** for the spec.
   3. Run the done gate on `spec/<slug>` in a fresh worktree.
   4. **App run.** Skip when there is no display (cloud session), and when the spec adds a migration but the dev app still opens the real database (plan M0 step 3 not landed). Otherwise run `pnpm dev:log` in that worktree, wait as `AGENTS.md` describes, and check the spec's behaviour in the window.
   5. Call the Skill tool with `pr` for the body. Open a draft PR from `spec/<slug>` to `main` that closes the spec issue and lists its tickets. When the app run was skipped, add `Not run in the app: <reason>. Check locally before merging.`
   6. Remove `orchestrating` from the spec.

7. **End** when no implementer is running and the frontier of every claimed spec is empty. Remove `orchestrating` from every spec still carrying it from this session.

Done when every claimed spec is either finished (step 6) or released with its stopped tickets listed in the final report.

## Stop

A stop pauses one ticket (or one spec, at step 6), never the whole run. Work that does not depend on it continues.

Stop when:

- a ticket is labelled `ready-for-human`;
- an implementer fails the done gate twice on one ticket;
- review findings remain after one round of fixes;
- an implementer reports `needs-owner` (a migration that drops or rewrites data, or a check that would have to be loosened).

To stop: comment the reason and the worktree path on the ticket, swap `ready-for-agent` for `ready-for-human`, unassign it, keep its worktree, and send a push notification if the session has that tool.

## Final report

- PRs opened or updated, one line each.
- Stopped tickets: number, reason, worktree path.
- Worktrees and branches left behind.
- For each finished spec: "Run `/retro` on this session."
