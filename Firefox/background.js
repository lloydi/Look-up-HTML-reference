// background.js

// Listen for clicks on the toolbar button
browser.browserAction.onClicked.addListener((tab) => {
  // Send a message to the content script in the active tab
  browser.tabs.sendMessage(tab.id, { action: "toggleDialog" })
    .catch((error) => {
      console.error("Failed to send message to content script:", error);
    });
});
