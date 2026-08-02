# Skillpacks

Versioned, product-neutral GBrain skillpacks for repository operations and skillpack maintenance. Each pack follows the `gbrain-skillpack-v1` package contract and carries its own routing fixtures, deterministic tests, gated live checks, judge evals, bootstrap runbook, changelog, and license.

## Included packs

| Pack | Skills | Purpose |
|---|---|---|
| [`repository-maintenance`](skillpacks/repository-maintenance/) | `repository-maintainer`, `issue-curator` | Maintain GitHub repositories and individual issue lifecycles; reconcile plans and evidence across an issue graph. |
| [`gbrain-skillpack-maintenance`](skillpacks/gbrain-skillpack-maintenance/) | `gbrain-skillpack-maintainer` | Create, validate, route, scaffold, package, and upgrade GBrain v1 skillpacks. |
| [`machine-session-analytics`](skillpacks/machine-session-analytics/) | `machine-session-analytics` | Compare content-free machine-wide Codex, Claude, and Cursor usage, API-equivalent pricing, tools, and evidence by repository; Conductor is optional enrichment. |

The packs contain workflow policy, not product policy. A consuming repository remains responsible for its own canonical product documents, label vocabulary, GitHub Project configuration, validation commands, and authorization boundaries.

When this repository is opened in Conductor on macOS, `session-analytics` is the default local run script. It starts the bundled machine-session-analytics dashboard directly from this checkout and opens it in the browser.

## Install into a repository

Requirements: Git, Python 3, and a current `gbrain` CLI. Run from this checkout:

```bash
./scripts/install.sh --target /path/to/project --all
```

Install one pack:

```bash
./scripts/install.sh --target /path/to/project --pack repository-maintenance
./scripts/install.sh --target /path/to/project --pack gbrain-skillpack-maintenance
./scripts/install.sh --target /path/to/project --pack machine-session-analytics
```

Preview every write first:

```bash
./scripts/install.sh --target /path/to/project --all --dry-run
```

For agents starting from an arbitrary repository, this temporary-clone form is self-contained:

```bash
skillpacks_tmp="$(mktemp -d)"
git clone --depth 1 https://github.com/rokas-tarasevicius/skillpacks.git "$skillpacks_tmp/source"
"$skillpacks_tmp/source/scripts/install.sh" --target "$PWD" --all --trust
rm -rf "$skillpacks_tmp"
```

`--trust` explicitly confirms GBrain may install code from the cloned packages; use it only after reviewing or otherwise trusting this repository. Without it, GBrain retains its interactive first-install confirmation.

The installer preflights every selected skill, host link, and managed routing block before asking GBrain to scaffold the packages additively into the target's `skills/` directory. It then creates relative `.agents/skills` and `.claude/skills` links and maintains an idempotent delimited routing section in `AGENTS.md` and `CLAUDE.md`. It never changes text outside that section and refuses to replace an existing non-matching host path.

Scaffolded files become owned by the target repository. Re-run with `--dry-run` before upgrading and review changes instead of assuming a new package version can overwrite local adaptations safely.

## GStack

These packs route repository work but do not vendor GStack. Install GStack separately using its supported setup command, then use its specialist workflows for planning, investigation, review, QA, security, shipping, deployment, and retrospectives. The routing table in [`AGENTS.md`](AGENTS.md) keeps those workflows distinct from repository and skillpack maintenance.

## Validate

Set `GBRAIN_ROOT` to an explicit GBrain checkout when `gbrain` is not on `PATH`:

```bash
./scripts/validate.sh
GBRAIN_ROOT=/path/to/gbrain ./scripts/validate.sh
```

Validation runs all packs' deterministic tests, GBrain doctor, routing evaluation, installer tests, and a repository-wide product-name scrub. The analytics runtime requires Node.js 24 or newer for native TypeScript and `node:sqlite`.
