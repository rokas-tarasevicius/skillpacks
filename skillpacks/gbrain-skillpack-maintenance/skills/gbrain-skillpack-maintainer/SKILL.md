---
name: gbrain-skillpack-maintainer
version: 0.1.0
description: Create, diagnose, validate, route, scaffold, package, distribute, and upgrade ordinary GBrain v1 skillpacks using current manifest, resolver, evaluation, trust, and host-exposure contracts.
mutating: true
brain_first: false
tools:
  - bun
  - git
  - python3
triggers:
  - create a GBrain skillpack
  - maintain a GBrain skillpack
  - update skill routing
  - diagnose trigger resolution
  - validate a GBrain skillpack
  - scaffold a GBrain skillpack
  - upgrade a GBrain skillpack
  - package a GBrain skillpack
---

# GBrain skillpack maintainer

## Contract

Keep skills in a real GBrain v1 package with one canonical source, deterministic routing, substantive evidence, safe scaffolding, and thin host exposure. Treat the targeted GBrain implementation and CLI help as authoritative when they differ from memory or this pack's verified snapshot.

Inputs are the requested package change, canonical pack tree, consuming host links, repository instructions, and the exact GBrain version or checkout in scope. Outputs are a minimal package change, compatibility provenance, routing evidence, doctor result, test result, and distribution caveats.

Read [the verified GBrain skillpack contract](references/gbrain-skillpack-contract.md) completely before changing a package or resolver.

## Phase 1: identify the contract in force

1. Inspect repository instructions, the canonical pack, host links, and all working-tree states that may overlap the change.
2. Resolve the exact GBrain executable or source checkout and record its version and commit when available.
3. When the version changed, inspect manifest validation, trigger indexing, routing evaluation, doctor rubric, scaffolding and trust behavior, packaging, CLI help, and current guides.
4. Classify the pack as ordinary third-party/local or brain-resident. Do not set brain-resident or schema metadata without matching repository semantics.

## Phase 2: design one canonical package

1. Use `gbrain skillpack init` as a disposable compatibility reference when creating a package or crossing a manifest version. Replace every placeholder.
2. Keep the canonical tree under `skillpacks/<name>/` with its manifest, listed skills, declared shared dependencies, runbook, changelog, license, tests, routing fixtures, and judge evals.
3. Put canonical natural-language routing phrases in each listed `SKILL.md` `triggers:` frontmatter. Keep exact phrases mutually exclusive.
4. Add `RESOLVER.md` or additive host routing only when frontmatter is insufficient. Do not add a dispatcher to a small pack.
5. Expose canonical skills to host-specific discovery with relative links. Never maintain copied canonical bodies.

## Phase 3: implement behavioral evidence

1. Give each skill a Contract, ordered Phases, Output Format, Anti-Patterns, and Tools Used.
2. Write realistic routing intents that cover all triggers, negative cases, boundary wording, and known overlap. Do not repeat triggers verbatim as fixtures.
3. Write substantive deterministic unit tests. Gate network, database, or live-host E2E checks explicitly.
4. Add at least three LLM-judge cases spanning important success and refusal boundaries.
5. Keep bootstrap instructions observable and non-mutating by default. GBrain displays the runbook; it does not execute it.
6. Bump the package version and update the changelog for observable behavior changes.

## Phase 4: validate in layers

1. Run deterministic package tests.
2. Run `gbrain skillpack doctor <pack> --quick --json` and require all structural dimensions.
3. Run `gbrain routing-eval --skills-dir <pack>/skills` separately. Doctor does not prove routing behavior.
4. Run repository validation and inspect host links.
5. Before distribution, run scaffold and pack operations in dry-run or disposable targets and review collisions, source pinning, trust details, bootstrap text, and license.

## Phase 5: upgrade without drift

1. Compare the targeted GBrain source with the version recorded in the reference.
2. Update provenance only for verified behavior and cite the tested version and commit.
3. Raise `gbrain_min_version` only when the pack relies on a newer contract.
4. Inspect diffs before applying clean hunks because two-way application can overwrite intentional local adaptations.
5. Re-run every validation layer.

## Output format

Report:

1. package version and GBrain version or commit validated against;
2. manifests, skills, routing, host links, tests, or distribution files changed;
3. doctor score, routing result, deterministic tests, and repository validation;
4. compatibility assumptions, trust prompts, collisions, and deferred publishing work.

## Anti-patterns

- Do not call loose host directories a skillpack.
- Do not duplicate canonical skill bodies across hosts.
- Do not put routing ownership only in prose or descriptions.
- Do not treat a perfect doctor score as behavioral proof.
- Do not ship initializer placeholders, tautological routing fixtures, or empty tests.
- Do not add resolver files, dispatchers, brain-resident flags, or shared dependencies without a demonstrated need.
- Do not auto-run bootstrap instructions or silently trust an unpinned remote source.
- Do not publish, merge, deploy, or modify a consuming host unless the request authorizes it.

## Tools used

- A pinned or current GBrain CLI/source checkout for init, doctor, routing, scaffold, and pack operations.
- `git` for provenance, diffs, links, and change isolation.
- The package's deterministic tests and repository validation command.
