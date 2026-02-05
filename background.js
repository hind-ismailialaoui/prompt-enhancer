// background.js
importScripts(); // (noop) kept for clarity

// MV3 service worker can’t use ES modules easily without bundler.
// So we'll do a simple dynamic import pattern by inlining engine logic in background,
// OR (cleaner) just compute suggestions in content.js.
// For MVP: compute in content.js (no background call needed).
// Keep this file minimal for future API calls.

chrome.runtime.onInstalled.addListener(() => {
  // default settings
  chrome.storage.sync.set({
    tone: "pro",
    language: "fr"
  });
});