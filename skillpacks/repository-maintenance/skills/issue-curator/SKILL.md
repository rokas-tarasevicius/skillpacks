---
name: issue-curator
version: 0.1.0
description: Reconcile an approved plan, decision, discovery, review, or implementation evidence across an existing GitHub issue graph using minimal mutations, native relationships, preserved history, and requirement-to-evidence coverage.
mutating: true
brain_first: false
tools:
  - gh
  - git
  - python3
triggers:
  - reconcile information across issues
  - refresh the issue graph
  - deduplicate backlog outcomes
  - turn an approved plan into issues
  - map review findings to issues
  - curate a GitHub backlog
  - reconcile Project backlog
---

# Issue curator

## Contract

Treat new project information as a proposed delta to the existing GitHub graph. Preserve history, update before creating, assign each material requirement to one smallest owning outcome, and express real completion gates with native dependencies.

Inputs are the new facts, repository instructions, canonical documents, approved plans or review evidence, and current open and relevant closed issues. Output is the minimal reconciled graph plus what changed, what remained intentionally unchanged, and which external or human gates remain.

Read [the shared GitHub operating model](../conventions/github-operating-model.md) and [the reconciliation checklist](references/reconciliation-checklist.md) before remote mutation.

## Phase 1: load both sides of the diff

1. Read repository instructions and the canonical documents relevant to the new facts.
2. Inspect open and relevant closed issues, milestones, labels, parents, sub-issues, dependencies, linked pull requests, and applicable Project fields.
3. Extract material facts without turning every sentence into work.
4. Build a coverage matrix for happy paths, invalid input, authorization or refusal, dependency failure, concurrency or idempotency, recovery, user-visible states, accessibility, operational limits, redaction or observability, and closure evidence.
5. Assign each material requirement to exactly one smallest owning issue.

## Phase 2: classify every fact

Assign one disposition:

- already represented: leave unchanged unless misleading;
- new evidence: update the matching issue or add a dated evidence comment;
- changed scope or settled decision: update the canonical issue and record the change;
- independently closable outcome: create one issue under the correct parent when local policy requires one;
- proven completion gate: add a native `blocked by` dependency and explain it;
- superseded outcome: close it with a reason and replacement link;
- unresolved product or architecture choice: stop before GitHub mutation and return it to planning and canonical documentation;
- missing manual or external input: create or update a narrowly executable human-owned issue when the repository uses that model;
- explicit non-goal: create nothing.

## Phase 3: propose and apply the delta

1. Present exact issues, fields, parents, and dependency edges before remote writes.
2. Re-read affected objects immediately before mutation.
3. Update existing issues before creating new ones.
4. Apply parents after issues exist and dependencies after prerequisites exist.
5. Apply ownership and Project status only after issue contracts and blocker state are correct.
6. Make changed issues independently understandable without copying canonical documents: include delivery context, high-level design, precise source links, observable checks, refusal and recovery behavior, operational bounds, and mapped evidence.
7. Separate completeness from scope. Broaden an issue only to the complete behavior required for its one outcome; split independently releasable or reviewable outcomes.

## Phase 4: verify

1. Re-read the resulting graph and run the adopted maintenance audit.
2. Confirm no duplicate outcomes, orphaned relationships, wrong-direction dependencies, unexplained blockers, or cycles remain.
3. Confirm only eligible work is ready, active work has an owner and execution artifact, review work has evidence and a reviewable pull request, and closed work is represented as completed.
4. Confirm every changed issue explains why it exists, the intended implementation shape, meaningful failure paths, operational limits, and exact closure evidence.

## Output format

Report:

1. created, updated, closed, and intentionally unchanged issue numbers;
2. parent and dependency edges added or removed;
3. audit and re-read results;
4. unresolved decisions, external inputs, and human-action gates. If planning uncertainty stopped curation, state that no issues were mutated.

## Anti-patterns

- Do not use curation as permission to redesign the product.
- Do not create duplicates, erase history, or copy canonical documents into issues.
- Do not add dependencies for preferences or create work for explicit non-goals.
- Do not hide an unresolved choice inside a start gate or acceptance criterion.
- Do not mix human input and agent execution in one outcome when they can be separated by a real dependency.
- Do not use vague words such as “secure,” “bounded,” or “tested” instead of observable refusal behavior, named limits, and proof artifacts.

## Tools used

- `gh` for graph inspection and authorized GitHub mutations.
- `git` for canonical source and implementation evidence.
- The sibling read-only audit for adopted graph invariants.
