import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const skill = readFileSync(
  resolve(here, "../skills/gbrain-skillpack-maintainer/SKILL.md"),
  "utf8",
);
const reference = readFileSync(
  resolve(
    here,
    "../skills/gbrain-skillpack-maintainer/references/gbrain-skillpack-contract.md",
  ),
  "utf8",
);

test("requires layered structural and behavioral validation", () => {
  assert.match(skill, /doctor/);
  assert.match(skill, /routing-eval/);
  assert.match(skill, /substantive deterministic unit tests/);
  assert.match(skill, /Doctor does not prove routing behavior/);
});

test("preserves one canonical body and safe scaffold ownership", () => {
  assert.match(skill, /relative links/);
  assert.match(skill, /Never maintain copied canonical bodies/);
  assert.match(reference, /Scaffolded files become user-owned/);
  assert.match(reference, /Bootstrap text is displayed and never executed automatically/);
});

test("records explicit GBrain provenance", () => {
  assert.match(reference, /0\.42\.59\.0/);
  assert.match(reference, /5008b287e47bf791132eedfebf66bdef11e9398c/);
});
