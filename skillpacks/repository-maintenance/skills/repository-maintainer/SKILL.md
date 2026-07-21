---
name: repository-maintainer
version: 0.1.0
description: Perform one authorized GitHub repository operation and keep any claimed issue truthful through its full lifecycle, including labels, milestones, native relationships, branches, pull requests, Project status, closure, and directly unblocked work.
mutating: true
brain_first: false
tools:
  - gh
  - git
  - python3
triggers:
  - create a GitHub issue
  - edit a GitHub issue
  - manage GitHub labels
  - link issue dependencies
  - prepare a pull request
  - audit repository hygiene
  - move a Project item
  - own an issue lifecycle
---

# Repository maintainer

## Contract

Perform the smallest authorized repository or GitHub mutation and leave every touched object internally consistent. If an issue is claimed for implementation, keep its contract, evidence, assignee, branch or pull request, native relationships, open or closed state, and Project status truthful through merge or an explicit recorded handoff.

Inputs are the requested outcome, repository instructions, the current local tree, canonical repository documents, and current GitHub state. Outputs are the changed identifiers, verification evidence, and exact authority or external-input gates that remain.

Read [the shared GitHub operating model](../conventions/github-operating-model.md) before changing GitHub state. Treat repository-local instructions and policy configuration as authoritative where they intentionally specialize that baseline.

## Phase 1: establish context

1. Read `AGENTS.md` and the repository documents that own product, architecture, delivery, and security decisions. Discover their names; do not assume `PRODUCT.md`, `BUILD.md`, a fixed default branch, or a fixed Project number.
2. Inspect the relevant issue, labels, milestone, parent, sub-issues, dependencies, branch, commits, pull request, checks, and Project fields.
3. Search open and closed issues before creating one.
4. If new information may change several outcomes, route to `issue-curator` rather than editing opportunistically.
5. If a material product or architecture choice is unresolved, stop before remote mutation and return it to the repository's planning workflow and canonical decision record.

## Phase 2: define the mutation

Before writing remotely, state the exact objects, fields, and relationships that will change.

- Give each issue one observable, independently closable outcome with delivery context, a high-level design, scope and exclusions, success and refusal checks, operational bounds, native relationships, precise canonical links, and requirement-mapped evidence.
- Follow the repository's naming, label, milestone, ownership, and Project policy. Use Conventional Commit titles when no stronger local convention exists.
- Use native sub-issues for membership and native `blocked by` relationships only for genuine completion gates.
- Treat Project status as a view over issue truth. Do not use status labels when native state, assignees, pull requests, and dependencies already express the fact.
- Never claim human-owned work or infer credentials, cloud identity, merge authority, deployment authority, or publishing authority from an issue.

## Phase 3: execute safely

1. Re-read each target immediately before mutation so stale state cannot overwrite newer work.
2. Apply the minimum mutation that satisfies the contract.
3. Preserve discussion history. Close duplicates or superseded work with a reason and replacement link; never delete historical records merely to tidy the graph.
4. Keep secrets, customer data, private incident details, credentials, and personal identity data out of public repository artifacts.

### Claimed-issue lifecycle

1. Claim only objectively eligible agent-owned work. Assign the acting owner and move the item to the active status as one logical operation; re-read both fields and repair or report any partial claim.
2. Record the branch or pull request immediately. Update body checkboxes and evidence only when linked proof exists.
3. When a real blocker appears, add the native dependency, explain it, and move the item to the repository's blocked or backlog status. Do not leave blocked work ready, active, or in review.
4. Move work to review only when implementation-owned checks, required evidence, local validation, and a reviewable pull request are ready.
5. After an authorized merge, verify final evidence, close the issue, move its Project item to the completed status, and re-read all three facts.
6. Re-evaluate every open issue directly blocked by the completed issue. Advance it only if all current pickup gates pass; otherwise retain the truthful non-ready state and record the remaining gate.
7. If rights, OAuth scopes, evidence, or authority are missing, preserve the last truthful state and report the exact incomplete mutation.

## Phase 4: verify

1. Re-read every changed object and relationship.
2. Run the repository's deterministic validation appropriate to the change.
3. When the repository adopts the bundled policy, run:

   ```bash
   python3 skills/repository-maintainer/scripts/audit_issues.py
   ```

   Pass `--config <path>` for a repository-specific issue policy and Project flags only when that Project is in scope.
4. Confirm dependency direction, parent reciprocity, label cardinality, ownership, Project status, checked evidence, closure state, and absence of cycles.

## Output format

Report, in order:

1. outcome achieved;
2. files and GitHub object identifiers changed, including lifecycle transitions and directly blocked issues re-evaluated;
3. validation run and result;
4. missing authority, external inputs, human actions, and deliberately untouched work.

## Anti-patterns

- Do not create a second backlog or copy canonical documents into issue bodies.
- Do not create a duplicate because updating the existing issue is inconvenient.
- Do not turn an unresolved planning choice into an automatically executable issue.
- Do not model optional ordering as a blocker.
- Do not claim human-owned work or silently broaden an issue during implementation.
- Do not close an issue without evidence, completed Project state, and downstream blocker re-evaluation.
- Do not publish, merge, deploy, close, or message externally unless the request authorizes that state change.

## Tools used

- `gh` for explicit GitHub reads and authorized writes.
- `git` for branch, diff, commit, and history inspection.
- `python3` for the bundled read-only issue audit.
- The repository's own deterministic validation commands.
