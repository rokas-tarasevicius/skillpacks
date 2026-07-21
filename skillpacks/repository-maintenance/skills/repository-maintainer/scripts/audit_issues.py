#!/usr/bin/env python3
"""Read-only audit of a GitHub issue graph against a configurable policy."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

DEFAULT_POLICY: dict[str, Any] = {
    "required_label_namespaces": {
        "type": ["epic", "feature", "maintenance", "docs", "security", "bug"],
        "area": [],
        "priority": ["p0", "p1", "p2", "p3"],
        "actor": ["agent", "human"],
    },
    "title_pattern": (
        r"^(?P<type>[a-z][a-z0-9-]*)(?P<breaking>!)?"
        r"\((?P<scope>[a-z][a-z0-9-]*)\): "
        r"(?P<summary>[a-z][^\n]*[^.\s])$"
    ),
    "title_types": {
        "type:epic": ["epic"],
        "type:feature": ["feat", "build", "ci", "test", "refactor", "perf"],
        "type:maintenance": ["chore", "build", "ci"],
        "type:docs": ["docs"],
        "type:security": ["security"],
        "type:bug": ["fix"],
    },
    "epic_label": "type:epic",
    "agent_label": "actor:agent",
    "human_label": "actor:human",
    "forbidden_labels": ["todo", "in-progress", "blocked", "done"],
    "allowed_state_labels": ["state:external-blocker"],
    "required_sections": [
        "Outcome",
        "Delivery context",
        "Execution contract",
        "High-level design",
        "Scope",
        "Verifiable outcomes",
        "Failure and refusal cases",
        "Operational bounds",
        "Dependencies",
        "Canonical sources",
        "Not in scope",
        "Required evidence",
    ],
    "require_milestone": True,
    "require_parent_for_non_epics": False,
    "minimum_canonical_links": 1,
    "minimum_evidence_rows": 3,
    "minimum_outcomes": {"agent": 3, "human": 2},
    "minimum_refusals": {"agent": 2, "human": 1},
    "project_statuses": ["Backlog", "Ready", "In progress", "In review", "Done"],
    "project_ready_status": "Ready",
    "project_blocked_status": "Backlog",
    "project_review_status": "In review",
    "project_done_status": "Done",
}


def run(*command: str, allow_404: bool = False) -> str:
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode == 0:
        return result.stdout
    if allow_404 and "HTTP 404" in result.stderr:
        return ""
    raise RuntimeError(
        f"command failed ({result.returncode}): {' '.join(command)}\n{result.stderr.strip()}"
    )


def gh_json(endpoint: str, *, allow_404: bool = False) -> Any:
    output = run("gh", "api", endpoint, allow_404=allow_404)
    return json.loads(output) if output.strip() else None


def resolve_repo(explicit: str | None) -> str:
    if explicit:
        return explicit
    return run(
        "gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"
    ).strip()


def load_live_graph(repo: str, epic_label: str) -> dict[str, Any]:
    raw = json.loads(
        run(
            "gh",
            "issue",
            "list",
            "--repo",
            repo,
            "--state",
            "all",
            "--limit",
            "1000",
            "--json",
            "number,title,body,state,labels,milestone,assignees,url,closedByPullRequestsReferences",
        )
    )

    def load_issue(item: dict[str, Any]) -> dict[str, Any]:
        number = int(item["number"])
        labels = [label["name"] for label in item.get("labels", [])]
        is_epic = epic_label in labels
        parent_data = None
        if not is_epic:
            parent_data = gh_json(f"repos/{repo}/issues/{number}/parent", allow_404=True)
        sub_data = (
            gh_json(f"repos/{repo}/issues/{number}/sub_issues?per_page=100")
            if is_epic
            else []
        )
        blocked_data = gh_json(
            f"repos/{repo}/issues/{number}/dependencies/blocked_by?per_page=100"
        )
        pull_requests: list[dict[str, Any]] = []
        for reference in item.get("closedByPullRequestsReferences", []):
            url = reference.get("url") if isinstance(reference, dict) else None
            if isinstance(url, str) and url:
                pull_requests.append(
                    json.loads(
                        run(
                            "gh",
                            "pr",
                            "view",
                            url,
                            "--json",
                            "url,state,isDraft,statusCheckRollup",
                        )
                    )
                )
        return {
            "number": number,
            "title": item.get("title", ""),
            "body": item.get("body") or "",
            "state": str(item.get("state", "open")).lower(),
            "labels": labels,
            "milestone": item["milestone"]["title"] if item.get("milestone") else None,
            "assignees": [value["login"] for value in item.get("assignees", [])],
            "linked_pull_requests": pull_requests,
            "url": item.get("url"),
            "parent": int(parent_data["number"]) if parent_data else None,
            "sub_issues": [int(child["number"]) for child in sub_data or []],
            "blocked_by": [int(blocker["number"]) for blocker in blocked_data or []],
        }

    with ThreadPoolExecutor(max_workers=min(8, max(1, len(raw)))) as executor:
        issues = list(executor.map(load_issue, raw))
    return {"repository": repo, "issues": issues}


def load_live_project(owner: str, number: int) -> dict[str, Any]:
    project = json.loads(
        run(
            "gh",
            "project",
            "item-list",
            str(number),
            "--owner",
            owner,
            "--limit",
            "1000",
            "--format",
            "json",
        )
    )
    project["owner"] = owner
    project["number"] = number
    return project


def load_json(path: str) -> dict[str, Any]:
    if path == "-":
        value = json.load(sys.stdin)
    else:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def load_policy(path: str | None) -> dict[str, Any]:
    policy = json.loads(json.dumps(DEFAULT_POLICY))
    if not path:
        return policy
    override = load_json(path)
    for key, value in override.items():
        if key not in policy:
            raise ValueError(f"unsupported policy key: {key}")
        policy[key] = value
    return policy


def namespace_values(labels: Iterable[str], namespace: str) -> list[str]:
    return sorted(label for label in labels if label.startswith(f"{namespace}:"))


def section_body(body: str, heading: str) -> str | None:
    match = re.search(
        rf"^## {re.escape(heading)}\s*$\n(?P<body>.*?)(?=^## |\Z)",
        body,
        flags=re.MULTILINE | re.DOTALL,
    )
    return match.group("body").strip() if match else None


def checklist_items(section: str) -> list[tuple[bool, str]]:
    return [
        (mark.lower() == "x", text.strip())
        for mark, text in re.findall(r"^- \[([ xX])\] (.+)$", section, flags=re.MULTILINE)
    ]


def evidence_table_rows(section: str) -> int:
    rows = 0
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|") or stripped.count("|") < 3:
            continue
        cells = [cell.strip() for cell in stripped.strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells):
            continue
        if any(
            cell.lower()
            in {"requirement", "requirement group", "required proof artifact", "evidence"}
            for cell in cells
        ):
            continue
        rows += 1
    return rows


def project_item_number(item: dict[str, Any]) -> int | None:
    number = item.get("number")
    if number is None and isinstance(item.get("content"), dict):
        number = item["content"].get("number")
    return int(number) if number is not None else None


def project_item_repository(item: dict[str, Any]) -> str | None:
    repository = item.get("repository")
    if isinstance(item.get("content"), dict):
        repository = item["content"].get("repository") or repository
    if not isinstance(repository, str) or not repository.strip():
        return None
    normalized = repository.strip().removesuffix(".git").removesuffix("/")
    return normalized.rsplit("github.com/", 1)[-1].lower()


def pull_request_checks_pass(pull_request: dict[str, Any]) -> bool:
    checks = pull_request.get("statusCheckRollup")
    if not isinstance(checks, list) or not checks:
        return False
    for check in checks:
        if not isinstance(check, dict):
            return False
        status = str(check.get("status") or "").upper()
        conclusion = str(check.get("conclusion") or check.get("state") or "").upper()
        if status and status != "COMPLETED":
            return False
        if conclusion not in {"SUCCESS", "SKIPPED", "NEUTRAL"}:
            return False
    return True


def dependency_cycles(blocked_by: dict[int, list[int]]) -> list[list[int]]:
    cycles: set[tuple[int, ...]] = set()
    visiting: list[int] = []
    visited: set[int] = set()

    def walk(number: int) -> None:
        if number in visiting:
            start = visiting.index(number)
            cycle = visiting[start:] + [number]
            rotations = [
                tuple(cycle[index:-1] + cycle[:index] + [cycle[index]])
                for index in range(len(cycle) - 1)
            ]
            cycles.add(min(rotations))
            return
        if number in visited:
            return
        visiting.append(number)
        for blocker in blocked_by.get(number, []):
            walk(blocker)
        visiting.pop()
        visited.add(number)

    for issue_number in blocked_by:
        walk(issue_number)
    return [list(cycle) for cycle in sorted(cycles)]


def audit_project(
    graph: dict[str, Any], by_number: dict[int, dict[str, Any]], policy: dict[str, Any]
) -> list[str]:
    project = graph.get("project")
    if project is None:
        return []
    items = project.get("items") if isinstance(project, dict) else None
    if not isinstance(items, list):
        return ["project input must contain an items array"]

    errors: list[str] = []
    by_issue: dict[int, list[dict[str, Any]]] = {}
    repository = str(graph.get("repository", "")).lower()
    project_number = project.get("number", "configured")
    statuses = set(policy["project_statuses"])
    blocked_status = policy["project_blocked_status"]
    review_status = policy["project_review_status"]
    done_status = policy["project_done_status"]
    agent_label = policy["agent_label"]

    for item in items:
        if not isinstance(item, dict):
            continue
        item_repository = project_item_repository(item)
        if item_repository and repository and item_repository != repository:
            continue
        number = project_item_number(item)
        if number in by_number:
            by_issue.setdefault(number, []).append(item)

    for number, issue in sorted(by_number.items()):
        matches = by_issue.get(number, [])
        if len(matches) != 1:
            errors.append(
                f"#{number}: expected exactly one Project #{project_number} item, found {len(matches)}"
            )
            continue
        status = matches[0].get("status")
        if status not in statuses:
            errors.append(f"#{number}: unsupported Project status {status!r}")
            continue
        is_open = str(issue.get("state", "open")).lower() == "open"
        blockers = [
            value
            for value in (int(raw) for raw in issue.get("blocked_by", []))
            if str(by_number.get(value, {}).get("state", "open")).lower() == "open"
        ]
        if not is_open and status != done_status:
            errors.append(f"#{number}: closed issue must be {done_status}, found {status}")
        if is_open and status == done_status:
            errors.append(f"#{number}: open issue cannot be {done_status}")
        if blockers and status != blocked_status:
            errors.append(
                f"#{number}: issue with open blockers {blockers} must be {blocked_status}, found {status}"
            )
        if status in {"In progress", review_status} and not issue.get("assignees"):
            errors.append(f"#{number}: active issue has no assignee")
        if status == review_status and agent_label in issue.get("labels", []):
            outcomes = checklist_items(section_body(str(issue.get("body", "")), "Verifiable outcomes") or "")
            refusals = checklist_items(section_body(str(issue.get("body", "")), "Failure and refusal cases") or "")
            if any(not checked for checked, _ in outcomes + refusals):
                errors.append(f"#{number}: review issue has unchecked contract boxes")
            reviewable = [
                pull_request
                for pull_request in issue.get("linked_pull_requests", [])
                if isinstance(pull_request, dict)
                and str(pull_request.get("state", "")).upper() == "OPEN"
                and not pull_request.get("isDraft", False)
            ]
            if not reviewable:
                errors.append(f"#{number}: review issue has no open non-draft pull request")
            elif not any(pull_request_checks_pass(value) for value in reviewable):
                errors.append(f"#{number}: review issue has no pull request with passing checks")
    return errors


def audit(graph: dict[str, Any], policy: dict[str, Any]) -> list[str]:
    issues = graph.get("issues")
    if not isinstance(issues, list):
        return ["input must contain an issues array"]

    errors: list[str] = []
    by_number: dict[int, dict[str, Any]] = {}
    normalized_titles: dict[str, int] = {}
    title_pattern = re.compile(str(policy["title_pattern"]))
    epic_label = str(policy["epic_label"])
    agent_label = str(policy["agent_label"])
    human_label = str(policy["human_label"])
    require_parent = bool(policy["require_parent_for_non_epics"])

    for index, issue in enumerate(issues):
        if not isinstance(issue, dict):
            raise ValueError(f"issues[{index}] must be a JSON object")
        if "number" not in issue:
            raise ValueError(f"issues[{index}] must contain a number")
        try:
            number = int(issue["number"])
        except (TypeError, ValueError) as error:
            raise ValueError(f"issues[{index}].number must be an integer") from error
        if number in by_number:
            errors.append(f"duplicate issue number #{number}")
        by_number[number] = issue
        normalized = " ".join(str(issue.get("title", "")).lower().split())
        if normalized in normalized_titles:
            errors.append(f"#{number}: duplicate title of #{normalized_titles[normalized]}")
        normalized_titles[normalized] = number

    for number, issue in sorted(by_number.items()):
        title = str(issue.get("title", ""))
        match = title_pattern.fullmatch(title)
        if not match:
            errors.append(f"#{number}: invalid title: {title}")
        title_type = match.groupdict().get("type") if match else None
        scope = match.groupdict().get("scope") if match else None
        labels = [str(label) for label in issue.get("labels", [])]
        is_open = str(issue.get("state", "open")).lower() == "open"

        for namespace, allowed_values in policy["required_label_namespaces"].items():
            values = namespace_values(labels, namespace)
            if len(values) != 1:
                errors.append(
                    f"#{number}: expected one {namespace}:* label, found {values or 'none'}"
                )
            elif allowed_values and values[0].split(":", 1)[1] not in allowed_values:
                errors.append(f"#{number}: unsupported label {values[0]}")

        forbidden = sorted(set(policy["forbidden_labels"]).intersection(labels))
        if forbidden:
            errors.append(f"#{number}: forbidden status labels: {forbidden}")
        state_labels = sorted(label for label in labels if label.startswith("state:"))
        if len(state_labels) > 1 or not set(state_labels).issubset(policy["allowed_state_labels"]):
            errors.append(f"#{number}: unsupported or conflicting state labels: {state_labels}")
        if state_labels and human_label not in labels:
            errors.append(f"#{number}: external or manual state requires {human_label}")
        if agent_label in labels and state_labels:
            errors.append(f"#{number}: {agent_label} cannot carry a manual-input state label")
        if policy["require_milestone"] and is_open and issue.get("milestone") is None:
            errors.append(f"#{number}: open issue has no milestone")

        type_labels = namespace_values(labels, "type")
        title_types = policy["title_types"]
        if len(type_labels) == 1 and type_labels[0] in title_types:
            if title_type not in title_types[type_labels[0]]:
                errors.append(
                    f"#{number}: title type {title_type!r} does not match {type_labels[0]}"
                )
        area_labels = namespace_values(labels, "area")
        if len(area_labels) == 1 and scope != area_labels[0].split(":", 1)[1]:
            errors.append(f"#{number}: title scope {scope!r} does not match {area_labels[0]}")

        body = str(issue.get("body", ""))
        for heading in policy["required_sections"]:
            section = section_body(body, heading)
            if section is None:
                errors.append(f"#{number}: missing ## {heading} section")
            elif not section:
                errors.append(f"#{number}: empty ## {heading} section")

        canonical_sources = section_body(body, "Canonical sources") or ""
        canonical_links = re.findall(r"\[[^\]]+\]\([^\s)]+\.md#[^)]+\)", canonical_sources)
        if len(canonical_links) < int(policy["minimum_canonical_links"]):
            errors.append(
                f"#{number}: canonical sources need at least {policy['minimum_canonical_links']} precise Markdown link(s)"
            )
        operational_bounds = section_body(body, "Operational bounds") or ""
        if not re.search(r"\d|not applicable|inapplicable", operational_bounds, re.IGNORECASE):
            errors.append(f"#{number}: operational bounds need a number or non-applicability rationale")
        evidence = section_body(body, "Required evidence") or ""
        if evidence_table_rows(evidence) < int(policy["minimum_evidence_rows"]):
            errors.append(
                f"#{number}: required evidence needs at least {policy['minimum_evidence_rows']} mapped row(s)"
            )

        actor = "agent" if agent_label in labels else "human"
        outcomes = checklist_items(section_body(body, "Verifiable outcomes") or "")
        refusals = checklist_items(section_body(body, "Failure and refusal cases") or "")
        if len(outcomes) < int(policy["minimum_outcomes"][actor]):
            errors.append(
                f"#{number}: needs at least {policy['minimum_outcomes'][actor]} verifiable outcome checkboxes"
            )
        if len(refusals) < int(policy["minimum_refusals"][actor]):
            errors.append(
                f"#{number}: needs at least {policy['minimum_refusals'][actor]} failure/refusal checkboxes"
            )
        if not is_open and any(not checked for checked, _ in outcomes + refusals):
            errors.append(f"#{number}: closed issue has unchecked contract boxes")

        contract = section_body(body, "Execution contract") or ""
        expected_actor_label = agent_label if actor == "agent" else human_label
        for phrase in (expected_actor_label, "Automatic pickup:", "Start gate:", "Finish gate:"):
            if phrase not in contract:
                errors.append(f"#{number}: execution contract must name {phrase}")

        if epic_label in labels:
            if issue.get("parent") is not None:
                errors.append(f"#{number}: epic cannot have parent #{issue['parent']}")
        elif require_parent and is_open:
            parent = issue.get("parent")
            if parent is None:
                errors.append(f"#{number}: open non-epic issue has no parent")
            elif int(parent) not in by_number:
                errors.append(f"#{number}: parent #{parent} is absent from graph")
            elif epic_label not in by_number[int(parent)].get("labels", []):
                errors.append(f"#{number}: parent #{parent} is not an epic")

        blockers = [int(value) for value in issue.get("blocked_by", [])]
        described_blockers = {
            int(value) for value in re.findall(r"Blocked by #(\d+)", body, re.IGNORECASE)
        }
        for blocker in blockers:
            if blocker == number:
                errors.append(f"#{number}: issue cannot block itself")
            if blocker not in by_number:
                errors.append(f"#{number}: blocker #{blocker} is absent from graph")
            if blocker not in described_blockers:
                errors.append(f"#{number}: body does not explain native blocker #{blocker}")
        for blocker in sorted(described_blockers - set(blockers)):
            errors.append(
                f"#{number}: body says blocked by #{blocker}, but the native dependency is missing"
            )

    for parent_number, parent in sorted(by_number.items()):
        for child_number in [int(value) for value in parent.get("sub_issues", [])]:
            child = by_number.get(child_number)
            if child is None:
                errors.append(f"#{parent_number}: sub-issue #{child_number} is absent from graph")
            elif child.get("parent") != parent_number:
                errors.append(
                    f"#{parent_number}: sub-issue #{child_number} does not point back to its parent"
                )
    for child_number, child in sorted(by_number.items()):
        parent_number = child.get("parent")
        if parent_number is None or int(parent_number) not in by_number:
            continue
        parent_children = [
            int(value) for value in by_number[int(parent_number)].get("sub_issues", [])
        ]
        if child_number not in parent_children:
            errors.append(
                f"#{child_number}: parent #{parent_number} does not list it as a sub-issue"
            )

    blocked_by = {
        number: [int(value) for value in issue.get("blocked_by", [])]
        for number, issue in by_number.items()
    }
    for cycle in dependency_cycles(blocked_by):
        errors.append("dependency cycle: " + " -> ".join(f"#{value}" for value in cycle))
    errors.extend(audit_project(graph, by_number, policy))
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", help="GitHub OWNER/REPO; defaults to current repository")
    parser.add_argument("--input", help="Audit deterministic JSON instead of GitHub; use - for stdin")
    parser.add_argument("--config", help="Repository-owned JSON policy override")
    parser.add_argument("--project-owner", help="Also audit this GitHub Project v2 owner")
    parser.add_argument("--project-number", type=int, help="Also audit this Project v2 number")
    args = parser.parse_args()

    if bool(args.project_owner) != bool(args.project_number):
        parser.error("--project-owner and --project-number must be supplied together")
    try:
        policy = load_policy(args.config)
        graph = (
            load_json(args.input)
            if args.input
            else load_live_graph(resolve_repo(args.repo), str(policy["epic_label"]))
        )
        if args.project_owner and args.project_number:
            graph["project"] = load_live_project(args.project_owner, args.project_number)
        errors = audit(graph, policy)
    except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
        print(f"ERROR: {error}")
        return 2

    print(
        f"Audited {len(graph.get('issues', []))} issue(s) in "
        f"{graph.get('repository', 'fixture')}"
    )
    for error in errors:
        print(f"ERROR: {error}")
    if errors:
        print(f"Issue audit failed with {len(errors)} error(s)")
        return 1
    print("Issue audit passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
