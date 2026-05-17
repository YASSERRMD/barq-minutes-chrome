/// <reference types="chrome" />

// Lightweight MV3 service worker. We deliberately keep this file dependency-
// free so it always survives the MV3 module loader; verify-build.mjs parses
// the compiled output with acorn after every vite build to catch regressions.
//
// Side panel: opened via the toolbar popup (Popup.tsx calls
// chrome.sidePanel.open with a real user gesture). The action has a
// default_popup in the manifest, so chrome.action.onClicked would never fire
// here. setPanelBehavior(openPanelOnActionClick) likewise conflicts with a
// default_popup. Both were dead config and have been removed.

const SIDE_PANEL_PATH = 'index.html';

chrome.runtime.onInstalled.addListener(() => {
  // Ensure the side panel options are registered so chrome.sidePanel.open
  // from the popup has a target path to load. Idempotent.
  chrome.sidePanel
    .setOptions({ path: SIDE_PANEL_PATH, enabled: true })
    .catch(() => undefined);
});

type RuntimeMessage =
  | { type: 'ping' };

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse) => {
    if (message?.type === 'ping') {
      sendResponse({ ok: true, ts: Date.now() });
      return false;
    }
    return false;
  },
);

export {};
