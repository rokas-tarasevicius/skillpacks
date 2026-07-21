import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const auditScript = resolve(
  here,
  "../skills/repository-maintainer/scripts/audit_issues.py",
);

type Actor = "actor:agent" | "actor:human";

function body(actor: Actor, dependencies = "No native blocker.") {
  const agentOutcome =
    actor === "actor:agent" ? "- [ ] A third observable result is proven.\n" : "";
  const agentRefusal =
    actor === "actor:agent" ? "- [ ] Dependency failure leaves no duplicate work.\n" : "";
  return `## Outcome

The observable fixture outcome exists.

## Delivery context

The fixture proves that repository policy remains deterministic and independently understandable.

## Execution contract

- Owner: \`${actor}\`
- Automatic pickup: ${actor === "actor:agent" ? "allowed only from the configured ready state" : "forbidden"}
- Start gate: the issue contract is complete.
- Finish gate: outcomes and evidence are present.

## High-level design

Represent policy as deterministic graph data and reject any mutation that would contradict native relationships.

## Scope

- Exercise the graph policy.

## Verifiable outcomes

- [ ] The first observable result is proven.
- [ ] The second observable result is proven.
${agentOutcome}
## Failure and refusal cases

- [ ] Structurally invalid input is refused without advancing work.
${agentRefusal}
## Operational bounds

The audit completes within 10 seconds, creates 0 records, and performs no network request for fixtures.

## Dependencies

${dependencies}

## Canonical sources

- [Agent policy](https://github.com/example/repository/blob/main/AGENTS.md#routing)

## Not in scope

- Product implementation.

## Required evidence

| Requirement group | Required proof artifact |
|---|---|
| Outcomes | Passing deterministic test. |
| Refusals | Negative fixture. |
| Closure | Audit output. |`;
}

function validGraph() {
  return {
    repository: "example/repository",
    issues: [
      {
        number: 1,
        title: "epic(platform): ship the repository contract",
        body: body("actor:human"),
        state: "open",
        labels: ["type:epic", "area:platform", "priority:p1", "actor:human"],
        milestone: "M1",
        assignees: [],
        linked_pull_requests: [],
        parent: null,
        sub_issues: [2, 3],
        blocked_by: [],
      },
      {
        number: 2,
        title: "feat(platform): establish the repository contract",
        body: body("actor:agent"),
        state: "open",
        labels: ["type:feature", "area:platform", "priority:p1", "actor:agent"],
        milestone: "M1",
        assignees: [],
        linked_pull_requests: [],
        parent: 1,
        sub_issues: [],
        blocked_by: [],
      },
      {
        number: 3,
        title: "test(platform): verify the repository contract",
        body: body("actor:agent", "Blocked by #2 because the contract must exist first."),
        state: "open",
        labels: ["type:feature", "area:platform", "priority:p1", "actor:agent"],
        milestone: "M1",
        assignees: [],
        linked_pull_requests: [],
        parent: 1,
        sub_issues: [],
        blocked_by: [2],
      },
    ],
  };
}

function audit(graph: ReturnType<typeof validGraph>, config?: string) {
  const args = [auditScript, "--input", "-"];
  if (config) args.push("--config", config);
  return spawnSync("python3", args, {
    input: JSON.stringify(graph),
    encoding: "utf8",
  });
}

function auditJson(input: string, extra: string[] = []) {
  return spawnSync("python3", [auditScript, "--input", "-", ...extra], {
    input,
    encoding: "utf8",
  });
}

test("accepts a reciprocal, labeled, acyclic issue graph", () => {
  const result = audit(validGraph());
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Issue audit passed/);
});

test("rejects missing required labels and conventional-title drift", () => {
  const graph = validGraph();
  graph.issues[1]!.labels = graph.issues[1]!.labels.filter(
    (label) => !label.startsWith("priority:"),
  );
  graph.issues[1]!.title = "Implement repository contract";
  const result = audit(graph);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /expected one priority:\* label/);
  assert.match(result.stdout, /invalid title/);
});

test("rejects dependency cycles and prose-only blockers", () => {
  const graph = validGraph();
  graph.issues[1]!.blocked_by = [3];
  graph.issues[1]!.body = body("actor:agent", "Blocked by #3 because of an invalid cycle.");
  graph.issues[2]!.blocked_by = [];
  const result = audit(graph);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /native dependency is missing/);
  graph.issues[2]!.blocked_by = [2];
  const cycle = audit(graph);
  assert.match(cycle.stdout, /dependency cycle:/);
});

test("supports repository-owned parent policy overrides", (context) => {
  const graph = validGraph();
  graph.issues[1]!.parent = null;
  graph.issues[0]!.sub_issues = [3];
  const config = resolve(here, ".parent-policy.json");
  context.after(() => rmSync(config, { force: true }));
  writeFileSync(config, JSON.stringify({ require_parent_for_non_epics: true }));
  const result = audit(graph, config);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /open non-epic issue has no parent/);
});

test("rejects a blocked Project item outside the configured backlog status", () => {
  const graph = validGraph() as ReturnType<typeof validGraph> & {
    project: { number: number; items: Array<{ number: number; status: string }> };
  };
  graph.project = {
    number: 7,
    items: [
      { number: 1, status: "Backlog" },
      { number: 2, status: "Ready" },
      { number: 3, status: "Ready" },
    ],
  };
  const result = audit(graph);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /open blockers \[2\] must be Backlog/);
});

test("reports malformed JSON and malformed issue shapes as input errors", () => {
  const malformedJson = auditJson("{");
  assert.equal(malformedJson.status, 2);
  assert.match(malformedJson.stdout, /ERROR:/);

  for (const graph of [
    [],
    { repository: "example/repository", issues: [null] },
    { repository: "example/repository", issues: [{}] },
    { repository: "example/repository", issues: [{ number: "nope" }] },
  ]) {
    const result = auditJson(JSON.stringify(graph));
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.doesNotMatch(result.stderr, /Traceback/);
  }
});

test("rejects unsupported policy keys and incomplete Project arguments", (context) => {
  const config = resolve(here, ".invalid-policy.json");
  context.after(() => rmSync(config, { force: true }));
  writeFileSync(config, JSON.stringify({ unknown_policy_key: true }));
  const policy = audit(validGraph(), config);
  assert.equal(policy.status, 2);
  assert.match(policy.stdout, /unsupported policy key/);

  const projectArgs = auditJson(JSON.stringify(validGraph()), ["--project-owner", "example"]);
  assert.equal(projectArgs.status, 2);
  assert.match(projectArgs.stderr, /must be supplied together/);
});

test("rejects duplicate identity, status-label, milestone, and taxonomy drift", () => {
  const graph = validGraph();
  graph.issues.push({ ...graph.issues[2]!, labels: [...graph.issues[2]!.labels] });
  graph.issues[1]!.labels = [
    "type:docs",
    "area:other",
    "priority:urgent",
    "actor:agent",
    "state:external-blocker",
    "todo",
  ];
  graph.issues[1]!.milestone = null;
  const result = audit(graph);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /duplicate issue number/);
  assert.match(result.stdout, /duplicate title/);
  assert.match(result.stdout, /unsupported label priority:urgent/);
  assert.match(result.stdout, /forbidden status labels/);
  assert.match(result.stdout, /external or manual state requires actor:human/);
  assert.match(result.stdout, /actor:agent cannot carry/);
  assert.match(result.stdout, /open issue has no milestone/);
  assert.match(result.stdout, /title type 'feat' does not match type:docs/);
  assert.match(result.stdout, /title scope 'platform' does not match area:other/);
});

test("rejects incomplete issue bodies and closed unchecked contracts", () => {
  const graph = validGraph();
  graph.issues[1]!.body = "## Outcome\n\n";
  graph.issues[1]!.state = "closed";
  const result = audit(graph);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /empty ## Outcome section/);
  assert.match(result.stdout, /missing ## Delivery context section/);
  assert.match(result.stdout, /canonical sources need at least/);
  assert.match(result.stdout, /operational bounds need a number/);
  assert.match(result.stdout, /required evidence needs at least/);
  assert.match(result.stdout, /verifiable outcome checkboxes/);
  assert.match(result.stdout, /failure\/refusal checkboxes/);
  assert.match(result.stdout, /execution contract must name actor:agent/);

  graph.issues[1]!.body = body("actor:agent");
  const closed = audit(graph);
  assert.match(closed.stdout, /closed issue has unchecked contract boxes/);
});

test("rejects broken hierarchy and dependency relationships", () => {
  const graph = validGraph();
  graph.issues[0]!.parent = 2;
  graph.issues[0]!.sub_issues = [2, 99];
  graph.issues[1]!.parent = 99;
  graph.issues[1]!.blocked_by = [2, 99];
  graph.issues[1]!.body = body("actor:agent");
  const result = audit(graph);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /epic cannot have parent/);
  assert.match(result.stdout, /issue cannot block itself/);
  assert.match(result.stdout, /blocker #99 is absent/);
  assert.match(result.stdout, /body does not explain native blocker/);
  assert.match(result.stdout, /sub-issue #99 is absent/);
  assert.match(result.stdout, /does not point back to its parent/);
});

test("requires a checked agent contract and genuinely passing PR in review", () => {
  const graph = validGraph() as ReturnType<typeof validGraph> & {
    project: { number: number; items: Array<{ number: number; status: string }> };
  };
  graph.issues[1]!.assignees = ["agent"];
  graph.issues[1]!.linked_pull_requests = [
    { state: "OPEN", isDraft: false, statusCheckRollup: [] },
  ];
  graph.project = {
    number: 7,
    items: [
      { number: 1, status: "Backlog" },
      { number: 2, status: "In review" },
      { number: 3, status: "Backlog" },
    ],
  };
  const noChecks = audit(graph);
  assert.equal(noChecks.status, 1);
  assert.match(noChecks.stdout, /unchecked contract boxes/);
  assert.match(noChecks.stdout, /no pull request with passing checks/);

  graph.issues[1]!.body = body("actor:agent").replaceAll("- [ ]", "- [x]");
  graph.issues[1]!.linked_pull_requests = [
    {
      state: "OPEN",
      isDraft: false,
      statusCheckRollup: [{ status: "COMPLETED", conclusion: "SUCCESS" }],
    },
  ];
  const passing = audit(graph);
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
});
