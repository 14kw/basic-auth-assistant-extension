import assert from "node:assert/strict";
import test from "node:test";

import { filterRules, findMatchingRule, normalizeRule, validatePattern } from "../core.js";

test("finds the first enabled matching rule", () => {
  const rules = [
    { id: "disabled", pattern: "amplifyapp", username: "no", enabled: false },
    { id: "first", pattern: "^https://[^/]+\\.amplifyapp\\.com/", username: "alice" },
    { id: "second", pattern: "amplifyapp", username: "bob" },
  ];

  assert.equal(
    findMatchingRule(rules, "https://feature-a.example.amplifyapp.com/").username,
    "alice",
  );
});

test("skips invalid regular expressions", () => {
  const rules = [
    { id: "invalid", pattern: "[", username: "no" },
    { id: "valid", pattern: "example\\.com", username: "yes" },
  ];

  assert.equal(findMatchingRule(rules, "https://example.com/").username, "yes");
});

test("returns null when no rule matches", () => {
  assert.equal(findMatchingRule([{ pattern: "example" }], "https://amplifyapp.com/"), null);
});

test("validates patterns", () => {
  assert.equal(validatePattern("^https://"), "");
  assert.match(validatePattern("["), /^正規表現が不正です:/);
  assert.equal(validatePattern(""), "URL正規表現を入力してください。");
});

test("normalizes rule values", () => {
  const normalized = normalizeRule({
    id: "rule-1",
    name: "  dev  ",
    pattern: " example ",
    username: 123,
    password: null,
  });

  assert.deepEqual(normalized, {
    id: "rule-1",
    name: "dev",
    pattern: "example",
    username: "123",
    password: "",
    enabled: true,
  });
});

test("filters rules by name, pattern, or username", () => {
  const rules = [
    { name: "Production", pattern: "prod\\.example", username: "release-user", password: "secret-a" },
    { name: "Feature", pattern: "amplifyapp", username: "developer", password: "secret-b" },
  ];

  assert.deepEqual(filterRules(rules, "production"), [rules[0]]);
  assert.deepEqual(filterRules(rules, "AMPLIFY"), [rules[1]]);
  assert.deepEqual(filterRules(rules, "release-user"), [rules[0]]);
  assert.deepEqual(filterRules(rules, "secret-b"), []);
  assert.equal(filterRules(rules, "  "), rules);
});
