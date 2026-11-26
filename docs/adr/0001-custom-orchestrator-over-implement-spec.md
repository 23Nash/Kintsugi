# Custom orchestrator instead of implement-spec

Tickets are built by a project skill, `/orchestrate`, modelled on Matt Pocock's `implement-spec` but not the same. `implement-spec` builds one spec per run; we want a continuous workflow that drains every `ready-for-agent` ticket across all open specs, stops on named conditions for the owner, and runs the same way in local and cloud sessions. `implement-spec` is user-invoked, so no skill can call it; `/orchestrate` reuses its shape (task graph, frontier, worktree per ticket, merge, `code-review`) and calls only model-invoked skills (`tdd`, `code-review`, `pr`).

## Considered options

- **`implement-spec` as shipped**: one spec per run, no stop rules, no named personas. Rejected because the owner adds tickets continuously and wants to learn persona design.
- **One persona per layer (`rust-dev`, `ui-dev`, `planner`, `reviewer`)**: rejected because `to-tickets` cuts vertical slices through every layer, and `to-spec`, `to-tickets` and `code-review` already cover planning and review.

## Consequences

- Persona files in `.claude/agents/` (`explorer`, `implementer`, `merger`) map one-to-one to the subagent roles `implement-spec` names.
- A ticket closes when it merges into its spec's integration branch, not when the PR merges, because GitHub only clears a blocking edge once the blocker is closed.
- Tracker operations use REST `gh api` only, because cloud sessions block GraphQL.
- Updates to Matt's plugin reach `/orchestrate` only through the skills it calls; changes to `implement-spec` itself must be ported by hand.
