# Verified GBrain skillpack contract

## Provenance and freshness

This reference was verified against GBrain version `0.42.59.0`, commit `5008b287e47bf791132eedfebf66bdef11e9398c`, using its manifest validator, trigger index, routing evaluator, doctor rubric, third-party scaffolder, CLI help, anatomy guide, and reference pack.

Before changing a pack against another version, inspect the current implementation and update this provenance only when behavior is verified. At minimum inspect:

- `src/core/skillpack/manifest-v1.ts`;
- trigger-index and resolver filename handling;
- routing evaluator and command behavior;
- doctor rubric and command behavior;
- third-party scaffold, trust, state, reference, and packaging implementations;
- `docs/skillpack-anatomy.md` and current scaffolding guidance.

## Package anatomy

An ordinary third-party pack is rooted at `skillpack.json`:

```text
skillpack.json
skills/<slug>/SKILL.md
skills/<slug>/routing-eval.jsonl
runbooks/bootstrap.md
test/*.test.*
e2e/*.test.*
evals/*.judge.json
CHANGELOG.md
LICENSE
README.md
.gitignore
```

`gbrain skillpack init <name>` scaffolds this shape. Use it as a compatibility reference, then replace every placeholder with real behavior and evidence.

## Manifest v1

The API tag is `gbrain-skillpack-v1`. Required fields are:

- `api_version`;
- lowercase kebab-case `name` between 2 and 64 characters;
- three- or four-segment semver-shaped `version`;
- non-empty `description`, `author`, `license`, `homepage`, and `gbrain_min_version`;
- a non-empty `skills` array with safe relative `skills/` paths.

Optional fields include shared dependencies, excluded install files, test and eval globs, bootstrap runbook, changelog, schema versions, and brain-resident metadata. Use `shared_deps` only for files genuinely required by every selected skill. Ordinary repository workflow packs omit brain-resident and schema-pack metadata.

## Skill contract

Every listed directory contains `SKILL.md` frontmatter with:

- `name` matching its slug;
- a precise `description`;
- a non-empty canonical `triggers` list;
- useful metadata such as `version`, `mutating`, `tools`, and `brain_first` when applicable.

The body should define Contract, ordered Phases, Output Format, Anti-Patterns, and Tools Used. Keep product truth in the consuming repository's canonical documents.

## Resolver and trigger behavior

`SKILL.md` frontmatter `triggers:` is canonical routing input. Supported resolver or agent documents may be parsed additively; they do not replace frontmatter. Within a directory, `RESOLVER.md` has filename priority over `AGENTS.md` where both are supported.

Use no pack resolver when frontmatter is sufficient. Add a functional-area dispatcher only for a genuinely large routing surface with coherent areas and explicit subskill mapping. Do not copy always-on platform skill patterns into an ordinary pack.

## Routing evaluation

Each JSONL row uses:

```json
{"intent":"natural user phrasing","expected_skill":"skill-slug"}
```

Use `expected_skill: null` for negative cases and `ambiguous_with` only for intentional documented co-fire. Fixtures should be realistic paraphrases rather than trigger copies. Each skill needs at least five rows for the doctor rubric; quality also requires coverage of every trigger, negative cases, boundary wording, and known overlaps.

Run routing separately:

```bash
gbrain routing-eval --skills-dir <pack>/skills
```

## Doctor and behavioral evidence

Quick doctor scores ten structural dimensions:

1. valid manifest;
2. every listed skill has required frontmatter;
3. every skill has at least five routing rows;
4. exact triggers are mutually exclusive;
5. changelog contains the current version;
6. declared unit test exists;
7. declared E2E test exists;
8. declared judge eval has at least three cases;
9. bootstrap runbook exists;
10. license exists.

This is structural evidence. Placeholder tests may still score perfectly, so also run substantive tests, routing evaluation, judge evaluation where available, and repository validation.

## Scaffold, trust, and ownership

Third-party sources may be registry names, GitHub repositories, HTTPS Git URLs, local directories, or tarballs.

- Scaffolding is additive and refuses overwrites.
- Local sources do not require a trust prompt.
- Remote first use displays identity, source pin, author, license, and trust context; unattended use requires the explicit trust flag.
- Remote state and cache are content or version pinned.
- Bootstrap text is displayed and never executed automatically.
- Scaffolded files become user-owned.
- Reference mode is read-only by default.
- Clean-hunk application is two-way and can overwrite intentional adaptation; inspect the diff first.

Use `--dry-run` before scaffolding or packaging into a real host. Never execute untrusted bootstrap commands automatically.

## Host exposure

Keep one canonical package. In a consuming repository GBrain scaffolds canonical skills into `skills/<slug>/`. Host-specific discovery can use relative links:

```text
.agents/skills/<slug> -> ../../skills/<slug>
.claude/skills/<slug> -> ../../skills/<slug>
```

Do not copy bodies. Root agent instructions may add routing guidance but must not become a conflicting trigger database.

## Distribution and licensing

Give each independently distributed pack its own license, compatibility floor, version, changelog, homepage, and deterministic package artifact. Raise compatibility only for verified requirements. Publishing, registry changes, remote trust decisions, and release mutations require explicit authorization.
