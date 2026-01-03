chrome.runtime.onInstalled.addListener(() => {
    console.log('Smart Privacy Firewall installed');
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        
        chrome.storage.local.get(domain, (result) => {
          if (result[domain] && result[domain].result) {
            chrome.tabs.sendMessage(tabId, {
              action: 'updateWarning',
              verdict: result[domain].result.verdict,
              riskScore: result[domain].result.risk_score
            }).catch(() => {});
          }
        });
      } catch (e) {
        console.error('Invalid URL:', e);
      }
    }
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openPopup') {
      chrome.action.openPopup();
      sendResponse({ success: true });
    }
  });