export const RULES_STORAGE_KEY = "authRules";

export function exportSettings(rules) {
  return JSON.stringify({ format: "basic-auth-assistant", version: 1, rules }, null, 2);
}

export function importSettings(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("JSONファイルを読み込めません。"); }
  if (!data || data.format !== "basic-auth-assistant" || data.version !== 1 || !Array.isArray(data.rules)) {
    throw new Error("対応していない設定ファイルです。");
  }
  const ids = new Set();
  return data.rules.map((rule) => {
    if (!rule || typeof rule !== "object" || Array.isArray(rule) ||
        !["id", "name", "pattern", "username", "password"].every((key) => typeof rule[key] === "string") ||
        !rule.id || ids.has(rule.id) || typeof rule.enabled !== "boolean") {
      throw new Error("ルールの形式が不正です。設定は変更されませんでした。");
    }
    ids.add(rule.id);
    // Preserve unfinished rules and exact credentials, just as they were exported.
    return Object.fromEntries(["id", "name", "pattern", "username", "password", "enabled"].map((key) => [key, rule[key]]));
  });
}

export function normalizeRule(input) {
  input = input && typeof input === "object" ? input : {};
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
  if (typeof url !== "string" || !url.startsWith("https://")) return null;
  if (!Array.isArray(rules)) return null;
  for (const candidate of rules) {
    if (!candidate || typeof candidate !== "object") continue;
    const rule = normalizeRule(candidate);
    if (!rule.enabled || !rule.pattern || !rule.username) continue;

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
