import assert from "node:assert/strict";
import test from "node:test";
import { exportSettings, importSettings } from "../core.js";

const rules = [
  { id: "first", name: "本番", pattern: "^https://example\\.com/", username: " user ", password: " 秘密🔑\n ", enabled: false },
  { id: "draft", name: "", pattern: "[", username: "", password: "", enabled: true },
];

test("settings round trip preserves order, disabled rules, drafts and exact credentials", () => {
  assert.deepEqual(importSettings(exportSettings(rules)), rules);
  assert.deepEqual(importSettings(exportSettings([])), []);
});

test("rejects invalid JSON, foreign formats and unsupported versions", () => {
  for (const text of ["{", "null", "[]", JSON.stringify({ rules }),
    JSON.stringify({ format: "other", version: 1, rules }),
    JSON.stringify({ format: "basic-auth-assistant", version: 2, rules })]) {
    assert.throws(() => importSettings(text));
  }
});

test("rejects malformed rules and duplicate IDs instead of partially importing", () => {
  for (const invalid of [null, [], 42, {}, { ...rules[0], password: null },
    { ...rules[0], enabled: "false" }, { ...rules[0], id: "" }, rules[0]]) {
    assert.throws(() => importSettings(exportSettings([rules[0], invalid])));
  }
});

test("only imports known fields", () => {
  assert.deepEqual(importSettings(exportSettings([{ ...rules[0], unexpected: "value" }])), [rules[0]]);
});
