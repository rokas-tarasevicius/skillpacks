import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const settings = readFileSync(new URL("../.conductor/settings.toml", import.meta.url), "utf8");

test("exposes machine session analytics as the default local Conductor run script", () => {
  assert.match(
    settings,
    /^"\$schema" = "https:\/\/conductor\.build\/schemas\/settings\.repo\.schema\.json"$/m,
  );
  assert.match(settings, /^\[scripts\]$/m);
  assert.match(settings, /^run_mode = "concurrent"$/m);
  assert.match(settings, /^\[scripts\.run\.session-analytics\]$/m);
  assert.match(settings, /^available_in = \[ "local" \]$/m);
  assert.match(
    settings,
    /^command = "node skillpacks\/machine-session-analytics\/skills\/machine-session-analytics\/scripts\/server\.ts --open"$/m,
  );
  assert.match(settings, /^default = true$/m);
  assert.match(settings, /^icon = "activity"$/m);
});
