# Issue reconciliation checklist

## Inputs to compare

- new user decisions and constraints after durable recording;
- changed product, architecture, security, delivery, or agent instructions;
- approved plans and review findings;
- merged and open pull requests;
- implementation discoveries, failures, and validation evidence;
- current open and relevant closed issues and Project fields.

## Decision table

| Observation | Action |
|---|---|
| Same outcome already exists | Update it; do not create another |
| New fact changes acceptance | Edit the canonical issue and record the change |
| Evidence does not change scope | Add evidence to the matching issue or a dated comment |
| Outcome can ship and verify independently | Create one issue under the appropriate parent when required |
| Work cannot complete before another issue | Add a native `blocked by` relationship |
| Ordering is optional | Mention it in prose; do not add a dependency |
| Product or architecture choice is unresolved | Stop remote mutation and return the choice to planning and durable documentation |
| Manual action or external input is missing | Create or update narrowly scoped human-owned work when the repository uses that model |
| One outcome mixes human input and agent execution | Split it and connect the real gate |
| Work contradicts an explicit non-goal | Create nothing |
| Work is replaced | Close as superseded and link the replacement |

## Requirement coverage

For each affected outcome, consider:

- normal and empty input;
- invalid or hostile input;
- current authorization and refusal behavior;
- dependency and upstream failure;
- concurrency, retry, idempotency, and duplicate work;
- rollback, recovery, and uncertain outcomes;
- loading, empty, error, and conflict states where user-facing;
- accessibility and responsive behavior where applicable;
- time, size, count, concurrency, retry, retention, and cost limits;
- redaction, observability, and existence disclosure;
- exact closure and deployment evidence.

Assign each material requirement exactly once to the smallest owning issue. Dependencies do not replace caller-facing behavior that the dependent outcome must preserve.

## Final graph checks

- no duplicate outcomes;
- every native relationship is reciprocal and points in the correct direction;
- every blocker is explained and no cycle exists;
- required labels, milestone, ownership, and title convention match local policy;
- every changed issue has the configured execution-contract sections;
- source links point to precise durable decisions rather than document roots;
- verification boxes describe observable behavior and refusal boundaries;
- operational bounds name limits or justified non-applicability;
- required evidence maps requirements to exact artifacts;
- only unblocked, fully specified, correctly owned work is ready;
- active and review work has an owner and execution artifact;
- closed work has final evidence and completed Project state;
- issue bodies preserve history without copying whole canonical documents.
