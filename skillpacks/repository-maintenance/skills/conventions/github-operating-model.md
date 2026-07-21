# GitHub operating model

## Source hierarchy

1. Repository-owned product, architecture, security, and delivery documents hold durable decisions.
2. GitHub Issues are the live execution graph: outcomes, ownership, acceptance criteria, native relationships, and current evidence.
3. Pull requests, commits, test output, releases, and deployment records are delivery evidence.

Discover canonical document names from repository instructions. Do not impose a fixed `PRODUCT.md`, `BUILD.md`, default branch, Project number, roadmap shape, cloud, or deployment model.

Settle material product and architecture choices in the repository's planning workflow and durable decision record before creating automatically executable issues. Do not maintain a second committed backlog.

## What becomes an issue

Create or link an issue for each independently reviewable feature, defect, security finding, infrastructure change, dependency upgrade, documentation outcome, or maintenance task. Tiny edits may share an issue when they serve one outcome.

Each issue should state:

- one observable outcome and why it matters now;
- execution ownership and objective start and finish gates;
- intended high-level implementation shape and important failure behavior;
- included scope and explicit exclusions;
- behavior-based success, refusal, and recovery checks;
- concrete operational bounds or justified non-applicability;
- native parents and dependencies where used;
- precise canonical sources;
- requirement-to-artifact closure evidence.

An issue must cover the complete behavior required for its one outcome. Split work when parts can ship, fail, roll back, and be reviewed independently. Connect only genuine completion gates.

## Naming and labels

Follow the repository's established convention. When none exists, use:

```text
type(scope): imperative summary
```

Use lowercase type and scope, an imperative summary without a terminal period, `!` only for a real compatibility break, and a `BREAKING CHANGE:` footer where required.

Recommended issue title types and labels:

| Issue label | Default title types |
|---|---|
| `type:epic` | `epic` |
| `type:feature` | `feat`, `build`, `ci`, `test`, `refactor`, `perf` |
| `type:maintenance` | `chore`, `build`, `ci` |
| `type:docs` | `docs` |
| `type:security` | `security` |
| `type:bug` | `fix` |

The bundled audit defaults to exactly one `type:*`, `area:*`, `priority:*`, and `actor:*` label. Customize these namespaces in an issue-policy JSON file when the repository uses another taxonomy.

Recommended ownership labels:

- `actor:agent`: independently executable work that an agent may claim only after every pickup gate passes;
- `actor:human`: manual action, external setup, real-user validation, coordination, or work requiring personal authority.

Split mixed ownership into separate issues connected by a real dependency. Do not infer authority from an issue label.

## Graph semantics

- Use native sub-issues for outcome membership when the repository uses epics.
- If B cannot complete until A completes, make B natively **blocked by** A.
- Do not use dependencies for optional sequencing.
- Explain each blocker in `## Dependencies`; native graph state remains authoritative.
- Preserve closed dependencies as historical evidence unless local policy explicitly requires another model.
- Close an epic only after required children are closed or explicitly removed by a recorded scope decision.

## Issue execution contract

The default policy uses these sections:

1. `## Outcome`
2. `## Delivery context`
3. `## Execution contract`
4. `## High-level design`
5. `## Scope`
6. `## Verifiable outcomes`
7. `## Failure and refusal cases`
8. `## Operational bounds`
9. `## Dependencies`
10. `## Canonical sources`
11. `## Not in scope`
12. `## Required evidence`

An implementer should understand the intended shape before opening the code. Use a compact diagram only when it materially clarifies a multi-component flow, trust boundary, dependency chain, state machine, or lifecycle.

Acceptance boxes describe observable behavior, refusal, recovery, and evidence rather than files to edit. Operational bounds use numbers or named limits where the plan owns them. Required evidence maps each requirement group to a named test layer, review artifact, decision record, deployment record, or measurement.

## Project workflow

Read Project owner, number, field names, and statuses from repository configuration or explicit user scope. A common default is:

| Status | Meaning | Exit gate |
|---|---|---|
| `Backlog` | Valid but blocked, unscheduled, or not pickable | Complete contract, schedule, ownership, and no open blocker |
| `Ready` | Fully specified and unblocked | Atomic claim with assignee and active status |
| `In progress` | One owner is producing the outcome | Implementation complete and evidence or pull request ready |
| `In review` | Outcome is ready to verify | Approval and merge, or return to active work |
| `Done` | Issue is closed and final evidence is linked | Reopen and restore a truthful open status if invalidated |

Movement rules:

1. Never auto-pick an epic, closed issue, human-owned issue, blocked issue, incomplete contract, or item outside the configured ready status.
2. Claim by assigning the actor and moving status as one logical operation; re-read both fields afterward.
3. The claiming actor owns lifecycle maintenance through closure or an explicit handoff.
4. Move a newly blocked item out of ready, active, and review states.
5. Move to review only with current evidence, passing required checks, and a reviewable pull request when code is involved.
6. After authorized merge, verify evidence, close the issue, set completed Project status, and re-read all facts.
7. Re-evaluate every directly blocked issue. Advance only when all current gates pass.
8. Missing OAuth scope, merge rights, deployment authority, or evidence is a reported gate, not permission to bypass controls.

## Safety boundaries

Public repository text should be safe to retain indefinitely. Exclude secrets, tokens, customer data, reusable credentials, personal identity details, and incident content that increases exposure.

An issue describing cloud, deployment, publishing, or messaging work does not authorize that action. Require the repository's explicit identity, environment, review, and approval gates at execution time.
