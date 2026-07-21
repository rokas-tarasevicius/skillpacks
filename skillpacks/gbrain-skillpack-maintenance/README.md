# gbrain-skillpack-maintenance

A GBrain v1 package for authoring and maintaining ordinary third-party skillpacks.

It covers package anatomy, manifest compatibility, trigger ownership, routing fixtures, substantive tests, doctor and routing validation, trust-aware scaffolding, thin host exposure, deterministic packaging, and upgrades against explicit GBrain provenance.

## Validate

```bash
node --test test/*.test.ts
gbrain skillpack doctor . --quick
gbrain routing-eval --skills-dir skills
```

The gated E2E test creates a temporary package and requires an explicit GBrain checkout:

```bash
GBRAIN_ROOT=/path/to/gbrain GBRAIN_SKILLPACK_E2E=1 node --test e2e/*.test.ts
```

## Scaffold

```bash
gbrain skillpack scaffold ./skillpacks/gbrain-skillpack-maintenance --workspace /path/to/project --dry-run
```

Review the dry run before applying. Scaffolded files are owned by the consuming repository.
