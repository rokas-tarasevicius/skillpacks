import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const enabled = process.env["REPOSITORY_MAINTENANCE_GITHUB_E2E"] === "1";
const owner = process.env["REPOSITORY_MAINTENANCE_PROJECT_OWNER"];
const projectNumber = process.env["REPOSITORY_MAINTENANCE_PROJECT_NUMBER"];
const config = process.env["REPOSITORY_MAINTENANCE_POLICY"];
const here = dirname(fileURLToPath(import.meta.url));
const auditScript = resolve(
  here,
  "../skills/repository-maintainer/scripts/audit_issues.py",
);

test("the live GitHub graph satisfies the adopted policy", { skip: !enabled }, () => {
  const args = [auditScript];
  if (config) args.push("--config", config);
  if (owner && projectNumber) {
    args.push("--project-owner", owner, "--project-number", projectNumber);
  }
  const result = spawnSync("python3", args, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
