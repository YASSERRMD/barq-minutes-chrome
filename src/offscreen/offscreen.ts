/// <reference types="chrome" />

type OffscreenMessage =
  | { type: 'offscreen-ping' }
  | { type: 'offscreen-shutdown' };

chrome.runtime.onMessage.addListener(
  (message: OffscreenMessage, _sender, sendResponse) => {
    if (message?.type === 'offscreen-ping') {
      sendResponse({ ok: true, ts: Date.now() });
      return false;
    }
    if (message?.type === 'offscreen-shutdown') {
      sendResponse({ ok: true });
      return false;
    }
    return false;
  },
);

export {};
