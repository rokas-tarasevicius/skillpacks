# Bootstrap machine session analytics

GBrain displays these steps; it does not execute them.

1. Confirm macOS and Node.js 24 or newer are available. Codex, Claude, and Cursor provider stores are the primary evidence; Conductor metadata is optional enrichment.
2. Preview the installed skill and its content-free evidence boundary before running local analysis.
3. Run `node .agents/skills/machine-session-analytics/scripts/cli.ts --help`.
4. Launch the read-only dashboard with `node .agents/skills/machine-session-analytics/scripts/server.ts --open`.
5. Review the selected time window, analyzed-session count, provider mix, and pricing coverage before interpreting cross-repository comparisons.

The dashboard reads standard machine-wide Codex, Claude, and Cursor stores plus optional Conductor metadata. It never needs cloud credentials, network access, a consuming repository dependency, or a non-loopback bind address.
