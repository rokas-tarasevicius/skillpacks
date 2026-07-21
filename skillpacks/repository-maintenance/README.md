# repository-maintenance

A product-neutral GBrain v1 package for GitHub repository operations and issue-graph reconciliation.

## Skills

- `repository-maintainer` performs one authorized repository operation and owns any claimed issue through a truthful lifecycle.
- `issue-curator` compares approved plans, decisions, findings, and evidence with the existing graph and applies the smallest consistent delta.

Both skills use the shared GitHub operating model. Repositories can specialize label namespaces, title mappings, milestone requirements, parent rules, evidence thresholds, and Project statuses through a JSON policy passed to the read-only audit.

## Validate

```bash
node --test test/*.test.ts
gbrain skillpack doctor . --quick
gbrain routing-eval --skills-dir skills
```

Live GitHub checks are read-only and opt-in:

```bash
REPOSITORY_MAINTENANCE_GITHUB_E2E=1 node --test e2e/*.test.ts
```

Project verification additionally accepts `REPOSITORY_MAINTENANCE_PROJECT_OWNER` and `REPOSITORY_MAINTENANCE_PROJECT_NUMBER`.

## Scaffold

```bash
gbrain skillpack scaffold ./skillpacks/repository-maintenance --workspace /path/to/project --dry-run
```

Review the dry run before applying. GBrain displays the bootstrap runbook and never executes it automatically.
