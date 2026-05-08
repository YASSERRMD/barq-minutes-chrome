export function Popup() {
  const openSidePanel = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId !== undefined) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        window.close();
      }
    } catch {
      // sidePanel.open requires a user gesture; this click counts as one
    }
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="popup">
      <h1>Barq Minutes</h1>
      <p className="muted">Local-only meeting notes.</p>
      <div className="popup-actions">
        <button type="button" className="primary-button" onClick={openSidePanel}>
          Open side panel
        </button>
        <button type="button" className="ghost-button" onClick={openOptions}>
          Settings
        </button>
      </div>
    </div>
  );
}
