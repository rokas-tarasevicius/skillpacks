import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

const enabled = process.env["GBRAIN_SKILLPACK_E2E"] === "1";
const gbrainRoot = process.env["GBRAIN_ROOT"];

test(
  "current GBrain initializes and diagnoses a disposable package",
  { skip: !enabled },
  () => {
    assert.ok(gbrainRoot, "GBRAIN_ROOT is required when GBRAIN_SKILLPACK_E2E=1");
    const workspace = mkdtempSync(resolve(tmpdir(), "gbrain-skillpack-e2e-"));
    try {
      const cli = resolve(gbrainRoot!, "src/cli.ts");
      const target = resolve(workspace, "fixture-pack");
      const init = spawnSync(
        "bun",
        ["run", cli, "skillpack", "init", "fixture-pack", "--target", target],
        { encoding: "utf8" },
      );
      assert.equal(init.status, 0, init.stdout + init.stderr);
      const doctor = spawnSync(
        "bun",
        ["run", cli, "skillpack", "doctor", target, "--quick", "--json"],
        { encoding: "utf8" },
      );
      assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
      assert.match(doctor.stdout, /"score"\s*:\s*10/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  },
);
