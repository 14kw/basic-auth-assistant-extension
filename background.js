import { findMatchingRule, RULES_STORAGE_KEY } from "./core.js";

// A failed credential can trigger onAuthRequired repeatedly for the same request.
// Remember answered requests so Chrome can fall back to its normal login dialog.
const answeredRequests = new Set();

chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (
      details.isProxy ||
      details.scheme?.toLowerCase() !== "basic" ||
      answeredRequests.has(details.requestId)
    ) {
      callback({});
      return;
    }

    chrome.storage.local
      .get({ [RULES_STORAGE_KEY]: [] })
      .then((stored) => {
        const rule = findMatchingRule(stored[RULES_STORAGE_KEY], details.url);
        if (!rule || !rule.username) {
          callback({});
          return;
        }

        answeredRequests.add(details.requestId);
        callback({
          authCredentials: {
            username: rule.username,
            password: rule.password,
          },
        });
      })
      .catch(() => callback({}));
  },
  { urls: ["http://*/*", "https://*/*"] },
  ["asyncBlocking"],
);

function forgetRequest(details) {
  answeredRequests.delete(details.requestId);
}

chrome.webRequest.onCompleted.addListener(forgetRequest, {
  urls: ["http://*/*", "https://*/*"],
});

chrome.webRequest.onErrorOccurred.addListener(forgetRequest, {
  urls: ["http://*/*", "https://*/*"],
});
