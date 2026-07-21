#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/install.sh --target PATH [--all | --pack NAME ...] [--dry-run] [--skip-routing] [--trust]

Packs:
  repository-maintenance
  gbrain-skillpack-maintenance

The installer scaffolds selected local packs through GBrain, creates thin
.agents/skills and .claude/skills links, and maintains a delimited routing
section in AGENTS.md and CLAUDE.md.

Options:
  --trust  Confirm that GBrain may install code from these local packages.
           Use only after reviewing or otherwise trusting this repository.
EOF
}

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(CDPATH= cd -- "$script_dir/.." && pwd)"
target=""
dry_run=0
skip_routing=0
trust=0
declare -a packs=()

while (($#)); do
  case "$1" in
    --target)
      [[ $# -ge 2 ]] || { echo "ERROR: --target requires a path" >&2; exit 2; }
      target="$2"
      shift 2
      ;;
    --pack)
      [[ $# -ge 2 ]] || { echo "ERROR: --pack requires a name" >&2; exit 2; }
      packs+=("$2")
      shift 2
      ;;
    --all)
      packs=("repository-maintenance" "gbrain-skillpack-maintenance")
      shift
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    --skip-routing)
      skip_routing=1
      shift
      ;;
    --trust)
      trust=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

[[ -n "$target" ]] || { echo "ERROR: --target is required" >&2; exit 2; }
[[ ${#packs[@]} -gt 0 ]] || { echo "ERROR: choose --all or at least one --pack" >&2; exit 2; }
[[ -d "$target" ]] || { echo "ERROR: target directory does not exist: $target" >&2; exit 2; }
target="$(CDPATH= cd -- "$target" && pwd)"

declare -a gbrain_command
if [[ -n "${GBRAIN_ROOT:-}" ]]; then
  [[ -f "$GBRAIN_ROOT/src/cli.ts" ]] || {
    echo "ERROR: GBRAIN_ROOT does not contain src/cli.ts: $GBRAIN_ROOT" >&2
    exit 2
  }
  command -v bun >/dev/null 2>&1 || { echo "ERROR: bun is required with GBRAIN_ROOT" >&2; exit 2; }
  gbrain_command=(bun run "$GBRAIN_ROOT/src/cli.ts")
elif command -v gbrain >/dev/null 2>&1; then
  gbrain_command=(gbrain)
else
  echo "ERROR: gbrain is not on PATH; set GBRAIN_ROOT to an explicit checkout" >&2
  exit 2
fi

pack_skills() {
  case "$1" in
    repository-maintenance)
      printf '%s\n' repository-maintainer issue-curator
      ;;
    gbrain-skillpack-maintenance)
      printf '%s\n' gbrain-skillpack-maintainer
      ;;
    *)
      echo "ERROR: unsupported pack: $1" >&2
      return 2
      ;;
  esac
}

declare -a selected_skills=()
for pack in "${packs[@]}"; do
  pack_dir="$repository_root/skillpacks/$pack"
  [[ -f "$pack_dir/skillpack.json" ]] || {
    echo "ERROR: package does not exist: $pack_dir" >&2
    exit 2
  }
  while IFS= read -r skill; do
    selected_skills+=("$skill")
  done < <(pack_skills "$pack")
done

preflight_directory() {
  local path="$1"
  if [[ ( -e "$path" || -L "$path" ) && ! -d "$path" ]]; then
    echo "ERROR: expected a directory or absent path: $path" >&2
    return 1
  fi
}

preflight_directory "$target/skills"
for skill in "${selected_skills[@]}"; do
  preflight_directory "$target/skills/$skill"
  for host_dir in .agents .claude; do
    preflight_directory "$target/$host_dir"
    preflight_directory "$target/$host_dir/skills"
    link_path="$target/$host_dir/skills/$skill"
    link_target="../../skills/$skill"
    if [[ -L "$link_path" && "$(readlink "$link_path")" == "$link_target" ]]; then
      continue
    fi
    if [[ -e "$link_path" || -L "$link_path" ]]; then
      echo "ERROR: refusing to replace existing host skill path: $link_path" >&2
      exit 1
    fi
  done
done

if ((skip_routing == 0)); then
  routing_start='<!-- BEGIN skillpacks routing (managed by scripts/install.sh) -->'
  routing_end='<!-- END skillpacks routing -->'
  for instructions in AGENTS.md CLAUDE.md; do
    instructions_path="$target/$instructions"
    if [[ -e "$instructions_path" && ! -f "$instructions_path" ]]; then
      echo "ERROR: expected a regular file or absent path: $instructions_path" >&2
      exit 1
    fi
    start_count=0
    end_count=0
    if [[ -f "$instructions_path" ]]; then
      start_count="$(grep -Fxc "$routing_start" "$instructions_path" || true)"
      end_count="$(grep -Fxc "$routing_end" "$instructions_path" || true)"
    fi
    if [[ "$start_count" != "$end_count" || "$start_count" -gt 1 ]]; then
      echo "ERROR: incomplete or duplicated managed routing block in $instructions_path" >&2
      exit 1
    fi
  done
fi

for pack in "${packs[@]}"; do
  pack_dir="$repository_root/skillpacks/$pack"
  scaffold_args=(skillpack scaffold "$pack_dir" --workspace "$target")
  ((dry_run)) && scaffold_args+=(--dry-run)
  ((trust)) && scaffold_args+=(--trust)
  "${gbrain_command[@]}" "${scaffold_args[@]}"
done

ensure_link() {
  local host_dir="$1"
  local skill="$2"
  local link_path="$target/$host_dir/skills/$skill"
  local link_target="../../skills/$skill"

  if ((dry_run)); then
    if [[ -L "$link_path" && "$(readlink "$link_path")" == "$link_target" ]]; then
      echo "link unchanged: $link_path -> $link_target"
    else
      echo "would link: $link_path -> $link_target"
    fi
    return
  fi

  mkdir -p "$target/$host_dir/skills"
  if [[ -L "$link_path" && "$(readlink "$link_path")" == "$link_target" ]]; then
    return
  fi
  [[ -d "$target/skills/$skill" ]] || {
    echo "ERROR: GBrain did not scaffold expected skill: $target/skills/$skill" >&2
    return 1
  }
  ln -s "$link_target" "$link_path"
  echo "linked: $link_path -> $link_target"
}

for pack in "${packs[@]}"; do
  while IFS= read -r skill; do
    ensure_link .agents "$skill"
    ensure_link .claude "$skill"
  done < <(pack_skills "$pack")
done

if ((skip_routing == 0)); then
  routing_file="$(mktemp)"
  trap 'rm -f "$routing_file"' EXIT
  {
    echo '<!-- BEGIN skillpacks routing (managed by scripts/install.sh) -->'
    echo '## Skillpack routing'
    echo
    echo 'Use the installed canonical skills in `skills/`; `.agents/skills` and `.claude/skills` are thin discovery links.'
    echo
    echo '| Work | Route |'
    echo '|---|---|'
    [[ -d "$target/skills/repository-maintainer" || $dry_run -eq 1 ]] && echo '| One GitHub repository object or issue lifecycle operation | `repository-maintainer` |'
    [[ -d "$target/skills/issue-curator" || $dry_run -eq 1 ]] && echo '| Reconcile plans, decisions, findings, or evidence across several issues | `issue-curator` |'
    [[ -d "$target/skills/gbrain-skillpack-maintainer" || $dry_run -eq 1 ]] && echo '| Create, validate, route, scaffold, package, or upgrade a GBrain skillpack | `gbrain-skillpack-maintainer` |'
    echo '| Product discovery and planning | GStack `/office-hours` or `/autoplan` |'
    echo '| Architecture review | GStack `/plan-eng-review` |'
    echo '| Unexplained failure | GStack `/investigate` |'
    echo '| Code review or broad security review | GStack `/review` or `/cso` |'
    echo '| Browser QA | GStack `/qa` or `/qa-only` |'
    echo '| Pull-request shipping, deployment, and canary checks | GStack `/ship`, `/land-and-deploy`, or `/canary` |'
    echo
    echo 'Repository and skillpack maintenance do not authorize implementation, merging, publishing, deployment, credential discovery, or external messages unless the user explicitly places that state change in scope.'
    echo '<!-- END skillpacks routing -->'
  } > "$routing_file"

  for instructions in AGENTS.md CLAUDE.md; do
    if ((dry_run)); then
      echo "would update managed routing block: $target/$instructions"
    else
      python3 - "$target/$instructions" "$routing_file" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
block = Path(sys.argv[2]).read_text(encoding="utf-8").strip()
start = "<!-- BEGIN skillpacks routing (managed by scripts/install.sh) -->"
end = "<!-- END skillpacks routing -->"
text = path.read_text(encoding="utf-8") if path.exists() else ""
if (start in text) != (end in text):
    raise SystemExit(f"ERROR: incomplete managed routing block in {path}")
if start in text:
    before, remainder = text.split(start, 1)
    _, after = remainder.split(end, 1)
    updated = before.rstrip() + "\n\n" + block + after
else:
    prefix = text.rstrip()
    updated = (prefix + "\n\n" if prefix else "") + block + "\n"
path.write_text(updated, encoding="utf-8")
print(f"routed: {path}")
PY
    fi
  done
fi

if ((dry_run)); then
  echo "Validated ${#packs[@]} skillpack installation(s) for $target (dry-run)"
else
  echo "Installed ${#packs[@]} skillpack(s) into $target"
fi
