# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use `gh api` (REST) for every operation, never `gh issue` or `gh pr`: cloud sessions block GraphQL, so those subcommands return 403 there. REST works locally and in the cloud. `gh api` fills `{owner}/{repo}` from the clone.

## Conventions

- **Create an issue**: `gh api repos/{owner}/{repo}/issues -f title="..." -f body="..." -f "labels[]=ready-for-agent"`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh api repos/{owner}/{repo}/issues/<n> --jq '{number, title, body, state, labels: [.labels[].name]}'`. Comments: `gh api repos/{owner}/{repo}/issues/<n>/comments --jq '.[].body'`.
- **List issues**: `gh api --paginate 'repos/{owner}/{repo}/issues?state=open&labels=<label>&per_page=100' --jq '.[] | select(.pull_request | not) | {number, title, labels: [.labels[].name]}'`. The issues endpoint also returns PRs; the `select` drops them.
- **Database id** (needed for sub-issues and blocking): `gh api repos/{owner}/{repo}/issues/<n> --jq .id`. Not the `#number`, not `node_id`.
- **Make an issue a sub-issue of a parent**: `gh api --method POST repos/{owner}/{repo}/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`. List children: `gh api repos/{owner}/{repo}/issues/<parent>/sub_issues`. Without sub-issues, put `Part of #<parent>` at the top of the child body.
- **Blocking**: `gh api --method POST repos/{owner}/{repo}/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. Read: `gh api repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by`. A ticket is unblocked when every blocker is closed. Where dependencies are unavailable, fall back to a `Blocked by: #<n>, #<n>` line at the top of the body.
- **Comment on an issue**: `gh api repos/{owner}/{repo}/issues/<n>/comments -f body="..."`
- **Apply / remove labels**: `gh api repos/{owner}/{repo}/issues/<n>/labels -f "labels[]=<label>"` / `gh api --method DELETE repos/{owner}/{repo}/issues/<n>/labels/<label>`
- **Close / reopen**: `gh api --method PATCH repos/{owner}/{repo}/issues/<n> -f state=closed -f state_reason=completed` / `gh api --method PATCH repos/{owner}/{repo}/issues/<n> -f state=open`
- **Open a pull request**: `gh api repos/{owner}/{repo}/pulls -f title="..." -f head=<branch> -f base=main -f body="..." -F draft=true`. Update: `gh api --method PATCH repos/{owner}/{repo}/pulls/<n> -f body="..."`. Mark ready: `-F draft=false` is not accepted by REST; use the GitHub UI or leave it as a draft for the owner.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues:

- **Read a PR**: `gh api repos/{owner}/{repo}/pulls/<n>`, diff via `gh api repos/{owner}/{repo}/pulls/<n> -H "Accept: application/vnd.github.diff"`.
- **List external PRs for triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comment / label / close**: the issue endpoints above work on PR numbers.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either: the issue read returns a `pull_request` key when it is a PR.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: a sub-issue of the map. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`).
- **Blocking**: native issue dependencies, as in **Blocking** above.
- **Frontier query**: list the map's open sub-issues, drop any with an open blocker or an assignee; first in map order wins.
- **Claim**: `gh api repos/{owner}/{repo}/issues/<n>/assignees -f "assignees[]=$(gh api user --jq .login)"`, the session's first write.
- **Resolve**: comment the answer, close the issue, then append a context pointer (gist + link) to the map's Decisions-so-far.
