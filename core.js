export const RULES_STORAGE_KEY = "authRules";

export function normalizeRule(input) {
  return {
    id: typeof input.id === "string" && input.id ? input.id : crypto.randomUUID(),
    name: String(input.name ?? "").trim(),
    pattern: String(input.pattern ?? "").trim(),
    username: String(input.username ?? ""),
    password: String(input.password ?? ""),
    enabled: input.enabled !== false,
  };
}

export function validatePattern(pattern) {
  if (!pattern) {
    return "URL正規表現を入力してください。";
  }

  try {
    new RegExp(pattern);
    return "";
  } catch (error) {
    return `正規表現が不正です: ${error.message}`;
  }
}

export function findMatchingRule(rules, url) {
  for (const candidate of rules) {
    const rule = normalizeRule(candidate);
    if (!rule.enabled || !rule.pattern) continue;

    try {
      if (new RegExp(rule.pattern).test(url)) return rule;
    } catch {
      // An invalid stored rule should not stop evaluation of later rules.
    }
  }

  return null;
}

export function filterRules(rules, query) {
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase("ja");
  if (!normalizedQuery) return rules;

  return rules.filter((rule) =>
    [rule.name, rule.pattern, rule.username].some((value) =>
      String(value ?? "").toLocaleLowerCase("ja").includes(normalizedQuery),
    ),
  );
}
