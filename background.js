import { findMatchingRule, RULES_STORAGE_KEY } from "./core.js";

// A failed credential can trigger onAuthRequired repeatedly for the same request.
// Remember answered requests so Chrome can fall back to its normal login dialog.
const answeredRequests = new Set();
const storageReady = chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
storageReady.catch(() => {});

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

    storageReady.then(() => chrome.storage.local
      .get({ [RULES_STORAGE_KEY]: [] })
    )
      .then((stored) => {
        const rule = findMatchingRule(stored[RULES_STORAGE_KEY], details.url);
        if (!rule || answeredRequests.has(details.requestId)) {
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
  { urls: ["https://*/*"] },
  ["asyncBlocking"],
);

function forgetRequest(details) {
  answeredRequests.delete(details.requestId);
}

chrome.webRequest.onCompleted.addListener(forgetRequest, {
  urls: ["https://*/*"],
});

chrome.webRequest.onErrorOccurred.addListener(forgetRequest, {
  urls: ["https://*/*"],
});
