import { filterRules, normalizeRule, RULES_STORAGE_KEY, validatePattern } from "./core.js";

const list = document.querySelector("#rule-list");
const emptyState = document.querySelector("#empty-state");
const noResults = document.querySelector("#no-results");
const searchInput = document.querySelector("#rule-search");
const resultCount = document.querySelector("#result-count");
const template = document.querySelector("#rule-template");
const toast = document.querySelector("#toast");
let rules = [];
const expandedRuleIds = new Set();
let saveChain = Promise.resolve();
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1200);
}

function persistRules(showConfirmation = true) {
  const snapshot = structuredClone(rules);
  saveChain = saveChain.then(() => chrome.storage.local.set({ [RULES_STORAGE_KEY]: snapshot }))
    .then(() => { if (showConfirmation) showToast("保存しました"); })
    .catch(() => showToast("保存に失敗しました。入力を変更して再試行してください。"));
  return saveChain;
}

function updateRule(id, patch) {
  rules = rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule));
  void persistRules(false);
}

async function copyToClipboard(text, fallbackInput) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("正規表現をコピーしました");
  } catch {
    fallbackInput.value = text;
    fallbackInput.dispatchEvent(new Event("input", { bubbles: true }));
    fallbackInput.focus();
    fallbackInput.select();
    showToast("入力欄へ反映しました。選択部分をコピーできます");
  }
}

function bindInput(card, selector, rule, field, onInput) {
  const input = card.querySelector(selector);
  input.value = rule[field];
  input.addEventListener("input", () => {
    updateRule(rule.id, { [field]: input.value });
    onInput?.(input.value);
  });
  input.addEventListener("blur", () => {
    if (searchInput.value.trim()) render();
  });
  return input;
}

function render() {
  list.replaceChildren();
  emptyState.hidden = rules.length !== 0;

  const visibleRules = filterRules(rules, searchInput.value);

  noResults.hidden = rules.length === 0 || visibleRules.length !== 0;
  resultCount.textContent = rules.length === 0 ? "" : `${visibleRules.length} / ${rules.length}件`;

  for (const rule of visibleRules) {
    const card = template.content.firstElementChild.cloneNode(true);
    const body = card.querySelector(".rule-body");
    const expand = card.querySelector(".expand");
    const summaryName = card.querySelector(".summary-name");
    const summaryPattern = card.querySelector(".summary-pattern");
    const bodyId = `rule-body-${rule.id}`;
    body.id = bodyId;
    expand.setAttribute("aria-controls", bodyId);
    summaryName.textContent = rule.name || "名称未設定のルール";
    summaryPattern.textContent = rule.pattern || "URL正規表現が未設定です";

    function setExpanded(expanded) {
      body.hidden = !expanded;
      expand.setAttribute("aria-expanded", String(expanded));
      card.classList.toggle("expanded", expanded);
      if (expanded) expandedRuleIds.add(rule.id);
      else expandedRuleIds.delete(rule.id);
    }

    expand.addEventListener("click", () => {
      setExpanded(expand.getAttribute("aria-expanded") !== "true");
    });
    setExpanded(expandedRuleIds.has(rule.id));

    const enabled = card.querySelector(".enabled");
    enabled.checked = rule.enabled;
    enabled.addEventListener("change", () => updateRule(rule.id, { enabled: enabled.checked }));

    bindInput(card, ".name", rule, "name", (value) => {
      summaryName.textContent = value.trim() || "名称未設定のルール";
    });
    const pattern = bindInput(card, ".pattern", rule, "pattern", (value) => {
      summaryPattern.textContent = value.trim() || "URL正規表現が未設定です";
    });
    bindInput(card, ".username", rule, "username");
    const password = bindInput(card, ".password", rule, "password");
    const error = card.querySelector(".pattern-error");

    function validate() {
      error.textContent = validatePattern(pattern.value);
      pattern.setAttribute("aria-invalid", error.textContent ? "true" : "false");
    }

    pattern.addEventListener("input", validate);
    validate();

    for (const copyButton of card.querySelectorAll(".copy-regex")) {
      copyButton.addEventListener("click", () => {
        void copyToClipboard(copyButton.dataset.regex, pattern);
      });
    }

    card.querySelector(".toggle-password").addEventListener("click", (event) => {
      const visible = password.type === "text";
      password.type = visible ? "password" : "text";
      event.currentTarget.textContent = visible ? "表示" : "隠す";
      event.currentTarget.setAttribute("aria-label", visible ? "パスワードを表示" : "パスワードを隠す");
    });

    card.querySelector(".delete").addEventListener("click", async () => {
      rules = rules.filter((candidate) => candidate.id !== rule.id);
      expandedRuleIds.delete(rule.id);
      render();
      await persistRules();
    });

    list.append(card);
  }
}

async function addRule() {
  const rule = normalizeRule({
    name: "",
    pattern: "",
    username: "",
    password: "",
    enabled: true,
  });
  rules.push(rule);
  expandedRuleIds.add(rule.id);
  searchInput.value = "";
  render();
  await persistRules();
  list.lastElementChild?.querySelector(".name")?.focus();
}

document.querySelector("#add-rule").addEventListener("click", addRule);
document.querySelector("#add-first-rule").addEventListener("click", addRule);
document.querySelector("#clear-search").addEventListener("click", () => {
  searchInput.value = "";
  render();
  searchInput.focus();
});
searchInput.addEventListener("input", render);

try {
  const stored = await chrome.storage.local.get({ [RULES_STORAGE_KEY]: [] });
  if (!Array.isArray(stored[RULES_STORAGE_KEY])) throw new Error("Invalid rules");
  rules = stored[RULES_STORAGE_KEY].filter((rule) => rule && typeof rule === "object").map(normalizeRule);
  render();
} catch {
  document.querySelector("#add-rule").disabled = true;
  showToast("設定を読み込めませんでした。画面を開き直してください。");
}
