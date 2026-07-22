#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(CDPATH= cd -- "$script_dir/.." && pwd)"
cd "$repository_root"

declare -a gbrain_command
if [[ -n "${GBRAIN_ROOT:-}" ]]; then
  [[ -f "$GBRAIN_ROOT/src/cli.ts" ]] || {
    echo "ERROR: GBRAIN_ROOT does not contain src/cli.ts: $GBRAIN_ROOT" >&2
    exit 2
  }
  gbrain_command=(bun run "$GBRAIN_ROOT/src/cli.ts")
elif command -v gbrain >/dev/null 2>&1; then
  gbrain_command=(gbrain)
else
  echo "ERROR: gbrain is not on PATH; set GBRAIN_ROOT to an explicit checkout" >&2
  exit 2
fi

node --test skillpacks/repository-maintenance/test/*.test.ts
node --test skillpacks/repository-maintenance/e2e/*.test.ts
node --test skillpacks/gbrain-skillpack-maintenance/test/*.test.ts
node --test skillpacks/gbrain-skillpack-maintenance/e2e/*.test.ts
node --test skillpacks/machine-session-analytics/test/*.test.ts
node --test skillpacks/machine-session-analytics/skills/machine-session-analytics/scripts/*.test.ts
node --test skillpacks/machine-session-analytics/e2e/*.test.ts
node --test test/*.test.ts

python3 - <<'PY'
import ast
from pathlib import Path

path = Path("skillpacks/repository-maintenance/skills/repository-maintainer/scripts/audit_issues.py")
ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
print("Python syntax passed")
PY

for pack in repository-maintenance gbrain-skillpack-maintenance machine-session-analytics; do
  "${gbrain_command[@]}" skillpack doctor "skillpacks/$pack" --quick --json
  "${gbrain_command[@]}" routing-eval --skills-dir "skillpacks/$pack/skills"
done

product_name_pattern='flux''ary'
if rg -n -i "$product_name_pattern" --hidden --glob '!.git/**' --glob '!.context/**' .; then
  echo "ERROR: product-specific source text remains" >&2
  exit 1
fi

git diff --check
echo "Repository validation passed"
