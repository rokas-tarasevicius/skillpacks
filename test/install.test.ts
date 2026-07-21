import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "..");
const installer = resolve(repositoryRoot, "scripts/install.sh");

function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), "skillpacks-installer-"));
  const target = resolve(root, "target");
  const bin = resolve(root, "bin");
  mkdirSync(target);
  mkdirSync(bin);
  writeFileSync(resolve(target, "AGENTS.md"), "# Existing agent policy\n");
  const fake = resolve(bin, "gbrain");
  writeFileSync(
    fake,
    `#!/usr/bin/env bash
set -euo pipefail
pack="\${3}"
target="\${5}"
printf '%s\n' "$*"
if [[ "\${6:-}" == "--dry-run" ]]; then exit 0; fi
case "$(basename "$pack")" in
  repository-maintenance) skills=(repository-maintainer issue-curator) ;;
  gbrain-skillpack-maintenance) skills=(gbrain-skillpack-maintainer) ;;
  *) exit 2 ;;
esac
for skill in "\${skills[@]}"; do
  mkdir -p "$target/skills/$skill"
  printf '%s\n' "# $skill" > "$target/skills/$skill/SKILL.md"
done
`,
  );
  chmodSync(fake, 0o755);
  return { root, target, bin };
}

function run(target: string, bin: string, extra: string[] = []) {
  return spawnSync(installer, ["--target", target, "--all", ...extra], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}`, GBRAIN_ROOT: "" },
  });
}

test("installs canonical skills, host links, and idempotent routing", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const first = run(target, bin);
  assert.equal(first.status, 0, first.stdout + first.stderr);
  for (const skill of [
    "repository-maintainer",
    "issue-curator",
    "gbrain-skillpack-maintainer",
  ]) {
    assert.ok(existsSync(resolve(target, "skills", skill, "SKILL.md")));
    for (const host of [".agents", ".claude"]) {
      const link = resolve(target, host, "skills", skill);
      assert.ok(lstatSync(link).isSymbolicLink());
      assert.equal(readlinkSync(link), `../../skills/${skill}`);
    }
  }
  const agents = readFileSync(resolve(target, "AGENTS.md"), "utf8");
  assert.match(agents, /# Existing agent policy/);
  assert.match(agents, /repository-maintainer/);
  assert.match(agents, /GStack `\/review`/);
  const second = run(target, bin);
  assert.equal(second.status, 0, second.stdout + second.stderr);
  const after = readFileSync(resolve(target, "AGENTS.md"), "utf8");
  assert.equal((after.match(/BEGIN skillpacks routing/g) ?? []).length, 1);
});

test("dry-run makes no target changes", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const result = run(target, bin, ["--dry-run"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(existsSync(resolve(target, "skills")), false);
  assert.equal(readFileSync(resolve(target, "AGENTS.md"), "utf8"), "# Existing agent policy\n");
});

test("refuses to replace an existing host path", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const collision = resolve(target, ".agents", "skills", "repository-maintainer");
  mkdirSync(collision, { recursive: true });
  const result = run(target, bin);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refusing to replace existing host skill path/);
  assert.equal(existsSync(resolve(target, "skills")), false);
  assert.equal(existsSync(resolve(target, "CLAUDE.md")), false);
  assert.equal(readFileSync(resolve(target, "AGENTS.md"), "utf8"), "# Existing agent policy\n");
});

test("passes trust to GBrain only when explicitly requested", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const result = run(target, bin, ["--trust", "--dry-run"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /skillpack scaffold .* --workspace .* --dry-run --trust/);
});

test("installs one selected pack and can skip routing", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const result = spawnSync(
    installer,
    ["--target", target, "--pack", "repository-maintenance", "--skip-routing"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}`, GBRAIN_ROOT: "" },
    },
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(existsSync(resolve(target, "skills", "repository-maintainer", "SKILL.md")));
  assert.equal(existsSync(resolve(target, "skills", "gbrain-skillpack-maintainer")), false);
  assert.equal(readFileSync(resolve(target, "AGENTS.md"), "utf8"), "# Existing agent policy\n");
  assert.equal(existsSync(resolve(target, "CLAUDE.md")), false);
});

test("refuses an incomplete routing marker before making changes", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(
    resolve(target, "CLAUDE.md"),
    "<!-- BEGIN skillpacks routing (managed by scripts/install.sh) -->\n",
  );
  const result = run(target, bin);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /incomplete or duplicated managed routing block/);
  assert.equal(existsSync(resolve(target, "skills")), false);
});

test("reports invalid arguments without invoking GBrain", (context) => {
  const { root, target, bin } = fixture();
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const unknownPack = spawnSync(
    installer,
    ["--target", target, "--pack", "unknown"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}`, GBRAIN_ROOT: "" },
    },
  );
  assert.equal(unknownPack.status, 2);
  assert.match(unknownPack.stderr, /package does not exist/);

  const missingTarget = spawnSync(installer, ["--all"], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH ?? ""}`, GBRAIN_ROOT: "" },
  });
  assert.equal(missingTarget.status, 2);
  assert.match(missingTarget.stderr, /--target is required/);
});
