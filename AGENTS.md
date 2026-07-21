# Skillpacks agent guide

This repository publishes product-neutral GBrain v1 skillpacks. Keep each package independently versioned and distributable. Do not add application architecture, customer data, organization-specific credentials, fixed cloud accounts, or product-specific trust policy to a reusable pack.

## Read order

1. Read this file and the target pack's `README.md` and `skillpack.json`.
2. Read the selected skill from top to bottom.
3. Read every reference that the selected skill marks as required for the current operation.
4. Inspect the current GBrain implementation and CLI help when package behavior or compatibility may have changed.

## Routing

| Work | Route |
|---|---|
| One repository, issue, label, milestone, dependency, branch, commit, pull request, Project item, or issue lifecycle operation | `repository-maintainer` |
| Reconcile a plan, review, decision, discovery, or implementation evidence across several existing issues | `issue-curator` |
| Create, diagnose, validate, route, scaffold, package, publish, or upgrade a GBrain skillpack | `gbrain-skillpack-maintainer` |
| Product discovery or forcing questions | GStack `/office-hours` |
| Multi-discipline plan review | GStack `/autoplan` |
| Architecture planning | GStack `/plan-eng-review` |
| Unexplained bug or failure | GStack `/investigate` |
| General pre-landing code review | GStack `/review` |
| Broad security review | GStack `/cso` |
| Browser QA | GStack `/qa` or `/qa-only` |
| Pull-request preparation and shipping | GStack `/ship` |
| Merge, deploy, and post-deploy checks | GStack `/land-and-deploy` or `/canary` |
| Context handoff | GStack `/context-save` or `/context-restore` |

Repository maintenance does not authorize implementation, merging, deployment, publishing, credential discovery, or external messaging. Skillpack maintenance does not authorize modifying a consuming repository unless that repository is explicitly in scope.

## Package rules

- Keep canonical packages under `skillpacks/<pack-name>/`.
- Put canonical trigger phrases in each manifest-listed `SKILL.md` frontmatter and keep trigger ownership mutually exclusive.
- Keep `SKILL.md` focused on repeatable workflow. Put detailed contracts and policy examples in directly linked references.
- Make default validation deterministic and network-independent. Gate live GitHub checks with explicit environment variables.
- Treat doctor as structural evidence. Run routing evaluation and substantive tests separately.
- Use relative links for host exposure; never maintain copied skill bodies.
- Bump the affected package version and changelog for every observable package change.
- Run `./scripts/validate.sh` before handoff.
