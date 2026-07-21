import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const maintainer = readFileSync(
  resolve(here, "../skills/repository-maintainer/SKILL.md"),
  "utf8",
);
const curator = readFileSync(resolve(here, "../skills/issue-curator/SKILL.md"), "utf8");
const model = readFileSync(
  resolve(here, "../skills/conventions/github-operating-model.md"),
  "utf8",
);

test("makes the claiming actor own lifecycle through closure", () => {
  for (const contract of [maintainer, model]) {
    assert.match(contract, /claim/i);
    assert.match(contract, /evidence/i);
    assert.match(contract, /Project status/i);
    assert.match(contract, /close|closure/i);
    assert.match(contract, /directly blocked/i);
  }
});

test("keeps single-object maintenance separate from graph reconciliation", () => {
  assert.match(maintainer, /If new information may change several outcomes, route to `issue-curator`/);
  assert.match(curator, /Assign each material requirement to exactly one smallest owning issue/);
  assert.match(curator, /Update existing issues before creating new ones/);
});

test("does not impose product or cloud configuration", () => {
  assert.match(model, /Discover canonical document names/);
  assert.match(model, /Do not impose a fixed/);
  assert.match(maintainer, /Never claim human-owned work or infer credentials/);
  assert.match(curator, /Do not use curation as permission to redesign the product/);
});
