---
name: machine-session-analytics
version: 0.3.0
description: Compute privacy-safe machine-wide usage value, tool, evidence, and lifecycle metrics from every locally evidenced Codex, Claude, and Cursor session, grouped by repository with optional Conductor enrichment.
mutating: false
brain_first: false
tools:
  - node
  - sqlite
triggers:
  - coding agent session analytics
  - local coding agent session
  - Codex Claude Cursor usage
  - priced Codex Claude Cursor usage
  - usage across all repositories
  - local agent sessions by repository
  - priced agent usage across repositories
  - localhost agent session dashboard
  - machine session snapshot
  - local agent compaction and tool usage
  - model pricing coverage
  - Cursor session history by repository
  - sessions registered by Conductor
---

# Machine session analytics

## Contract

Measure agent usage across the entire machine without returning prompts, reasoning, tool arguments, tool results, messages, commands, transcript paths, workspace metadata, provider session IDs, credentials, or raw local errors. Union provider-owned Codex, Claude, and Cursor history regardless of where the associated repository lives; assign sessions through validated working directories, IDE workspace mappings, optional Conductor metadata, and Git roots; preserve pricing provenance and estimation status; and distinguish operational indicators from verified outcomes.

Inputs are machine-wide Codex and Claude transcript trees, the local Cursor history databases, an optional read-only Conductor database, optional repository/evidence-path filters, and a versioned rate card. Outputs are a content-free CLI snapshot or localhost-only dashboard with machine, repository, session, model, token, cache, cost, tool-name, duration, compaction, provider, and evidence metrics.

Read [the metric and interpretation catalog](references/metrics-catalog.md) completely before adding a metric, changing a rate, changing public fields, or interpreting dashboard results.

## Phase 1: select the evidence set

1. Default to the union of active and archived global Codex transcripts, Claude Code plus Claude Desktop local-agent transcripts, and Cursor's global/workspace composer and bubble history. These provider stores are canonical session evidence and are not limited to repositories registered in another application.
2. Open SQLite read-only. If `~/Library/Application Support/com.conductor.app/conductor.db` exists, use it only to enrich repository/workspace attribution and preserve registered zero-session repositories; absence of that database must not narrow provider discovery.
3. Narrow only when the caller intentionally supplies `--repo-id`, `--repo-name`, `--repo-root`, or `--repo-remote`. A duplicate name is an error; prefer the stable repository ID.
4. Include hidden optional metadata records by default so machine totals are complete. Exclude them only with `--exclude-hidden` and label that scope.
5. Index each provider transcript tree once. Validate provider metadata ID and working directory, then assign every unclaimed provider session by exact working directory, IDE/Conductor workspace mapping, and canonical Git root.
6. Recover a legacy Conductor row without a provider ID only when one transcript uniquely matches provider, working directory, and a 15-minute start-time window. Omit database-only stubs rather than guessing or double-counting them.
7. Read Cursor's local SQLite history without returning message content. Hydrate modern bubble records, deduplicate `toolFormerData.toolCallId`, and assign composers through workspace databases, recorded paths, and Git roots. Use provider-reported `usageData.costInCents` as usage value when present; do not infer a daily cost timestamp.
8. Treat working sessions as live snapshots whose totals may change on refresh. Never select evidence by title, modification time, or nearest filename. “All repositories” means every repository evidenced by a provider session plus optional registered zero-session repositories; it does not mean crawling unrelated directories that contain no agent evidence.

## Phase 2: calculate content-free metrics

1. Stream JSONL and retain only allowlisted counters, timestamps, event classes, tool names, stable internal call IDs, and provider model IDs.
2. For Codex, treat `total_token_usage` as a process-wide snapshot, not a session-local counter. Fingerprint each total/last-usage state across the full evidence union, assign it to the observing file with the closest preceding local response activity (then break ties deterministically), and sum the deduplicated `last_token_usage` request. Re-evaluate top-level/sub-agent attribution at every `session_meta` transition.
3. For Claude, deduplicate repeated assistant response IDs and tool-use block IDs across the main transcript and delegated trace tree before summing usage. Attribute main-file usage to top-level execution and nested `subagents` evidence to sub-agent execution inside the composite session.
4. Count effective Codex code-mode tools only from `tools.<name>(` identifiers; never return or persist the surrounding JavaScript or arguments.
5. Keep missing evidence roots, malformed records, unsupported providers, zero-token sessions, and unpriced models visible without failing unrelated repositories. Do not turn stale database pointers into fake missing-transcript sessions.
6. Project internal evidence through the public content-free schema. Repository display name is the only human-authored repository field returned. Sessions use a one-way hashed local key rather than raw Conductor or provider IDs.

## Phase 3: apply a versioned rate card

1. Read `references/rate-cards.json` or an explicit `--rate-card` override and validate its effective date, providers, non-negative prices, multipliers, thresholds, and source provenance.
2. Apply uncached input, cache-read, observable cache-write, output, and request-level long-context rates separately.
3. Treat reasoning-output tokens as part of output, never an additional charge.
4. For Codex models without observable cache writes, report the ordinary estimate and an upper estimate that treats every uncached token as a cache write.
5. Include unknown-model tokens in the price-coverage denominator. When an owning Codex event precedes its model marker, recover a model only if that same evidence file contains exactly one model ID; otherwise leave it visibly unknown and unpriced. Never substitute a database model or another observer's model.
6. Call API-rate calculations API list-price equivalents or priced usage value, never invoices, charges, or actual spend. Keep provider-reported Cursor value separate.
7. Use `null`/not applicable when a ratio has no denominator.

## Phase 4: run the interfaces

From an installed skill directory, launch the dashboard:

```bash
node .agents/skills/machine-session-analytics/scripts/server.ts --open
```

The server binds only to `127.0.0.1`, rejects non-loopback hosts, coalesces concurrent refreshes, scans on startup, and refreshes only on an explicit browser request. It is read-only and returns no transcript content.

For a terminal summary or stable JSON snapshot:

```bash
node .agents/skills/machine-session-analytics/scripts/cli.ts
node .agents/skills/machine-session-analytics/scripts/cli.ts --json
node .agents/skills/machine-session-analytics/scripts/cli.ts --help
```

Use evidence-path overrides only for intentional local testing. Node.js 24 or newer is required for native TypeScript execution and `node:sqlite`.

## Phase 5: interpret without overclaiming

1. Start with scope, analyzed-session count, price coverage, working-snapshot share, and rate-card date before comparing usage value.
2. Use cost per turn, task marker, model call, tool call, or active hour only as an efficiency indicator, not a quality or success score.
3. Treat provider task-complete events, tool-result counts, idle status, and low compaction counts as operational proxies rather than verified outcomes.
4. Rank high spend, duration, tool volume, and compaction sessions as candidates for bounded investigation without declaring their cause. Do not label them anomalies, failures, or root causes.
5. Use a separate, explicitly scoped forensic workflow for causal reconstruction or raw chronology. Never expand this aggregate dashboard into transcript browsing.

## Output format

Report:

1. machine/repository selection, hidden-data choice, live-snapshot count, and generated time;
2. rate-card effective date, provider caveats, analyzed-session count, and price coverage;
3. machine and per-repository priced usage value, its API-equivalent/provider-reported basis, explicit top-level/sub-agent split, tokens, cache ratio, tools, duration, compactions, provider/model mix, and evidence status;
4. deterministic ranked outliers as investigation candidates, without declaring cause;
5. missing evidence roots/transcripts, unsupported schemas/providers, unpriced models, incomplete counters, and no-data ratios.

## Anti-patterns

- Do not return titles, branches, workspace names/paths, repository roots/remotes, raw session IDs, provider IDs, prompts, messages, reasoning, tool inputs/results, commands, transcript paths, credentials, or raw local exceptions.
- Do not call this a blind filesystem repository scan. The scope is every repository evidenced by provider sessions plus optional registered repository metadata.
- Do not require Conductor to discover provider sessions or treat its repository graph as the machine boundary. Do not open any metadata database in write mode or interrupt a session. Do not bind the dashboard to a LAN address, add CORS, or add remote telemetry.
- Do not price cached input at the uncached rate when cache reads are observable.
- Do not double-charge reasoning output or duplicate Claude response/tool records.
- Do not hide unpriced tokens, missing evidence roots, no-data denominators, or working snapshots inside a machine total.
- Do not call task completion “success,” cost “value,” or high tool volume a root cause.
- Do not fetch live prices at launch. Update the reviewed versioned rate card with source provenance.

## Tools used

- Node.js 24 `node:sqlite` for read-only Cursor/optional Conductor metadata and streaming JSONL analysis.
- Internal provider session IDs and working-directory metadata for exact correlation only.
- A versioned JSON rate card for reproducible API-equivalent estimates.
- A dependency-free HTTP server and browser UI bound to `127.0.0.1`.
