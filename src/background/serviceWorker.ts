/// <reference types="chrome" />

const SIDE_PANEL_PATH = 'index.html';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.windowId) return;
  try {
    await chrome.sidePanel.setOptions({
      path: SIDE_PANEL_PATH,
      enabled: true,
    });
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch {
    // user gesture required is enforced by Chrome
  }
});

type RuntimeMessage =
  | { type: 'ping' }
  | { type: 'open-side-panel' };

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, sender, sendResponse) => {
    if (message?.type === 'ping') {
      sendResponse({ ok: true, ts: Date.now() });
      return false;
    }
    if (message?.type === 'open-side-panel') {
      const windowId = sender.tab?.windowId;
      if (typeof windowId === 'number') {
        chrome.sidePanel.open({ windowId }).catch(() => undefined);
      }
      sendResponse({ ok: true });
      return false;
    }
    return false;
  },
);

export {};
