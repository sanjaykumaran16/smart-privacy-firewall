const PRIVACY_KEYWORDS = ['privacy', 'policy', 'terms', 'data protection'];

function detectPrivacyPolicyLinks() {
  const links = Array.from(document.querySelectorAll('a'));
  const privacyLinks = links.filter(link => {
    const text = link.textContent.toLowerCase();
    const href = link.href.toLowerCase();
    
    return PRIVACY_KEYWORDS.some(keyword => 
      text.includes(keyword) || href.includes(keyword)
    );
  });
  
  return privacyLinks.map(link => ({
    text: link.textContent.trim(),
    url: link.href
  }));
}

function injectWarningBanner(verdict, riskScore) {
  const existingBanner = document.getElementById('spf-warning-banner');
  if (existingBanner) {
    existingBanner.remove();
  }
  
  if (verdict === 'SAFE') {
    return;
  }
  
  const banner = document.createElement('div');
  banner.id = 'spf-warning-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 999999;
    padding: 12px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;
  
  if (verdict === 'WARNING') {
    banner.style.background = '#fff3cd';
    banner.style.color = '#856404';
    banner.style.borderBottom = '2px solid #ffc107';
    banner.innerHTML = `
      ⚠️ <strong>Privacy Warning:</strong> This site's privacy policy has concerns (Risk: ${riskScore}/100). 
      <a href="#" id="spf-details" style="color: #004085; text-decoration: underline; margin-left: 8px;">View Details</a>
      <button id="spf-dismiss" style="margin-left: 12px; padding: 4px 12px; background: #856404; color: white; border: none; border-radius: 4px; cursor: pointer;">Dismiss</button>
    `;
  } else if (verdict === 'BLOCKED') {
    banner.style.background = '#f8d7da';
    banner.style.color = '#721c24';
    banner.style.borderBottom = '2px solid #dc3545';
    banner.innerHTML = `
      🚫 <strong>High Privacy Risk:</strong> This site has significant privacy concerns (Risk: ${riskScore}/100). Proceed with caution.
      <a href="#" id="spf-details" style="color: #004085; text-decoration: underline; margin-left: 8px;">View Details</a>
      <button id="spf-dismiss" style="margin-left: 12px; padding: 4px 12px; background: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">Dismiss</button>
    `;
  }
  
  document.body.insertBefore(banner, document.body.firstChild);
  
  document.getElementById('spf-dismiss')?.addEventListener('click', () => {
    banner.remove();
  });
  
  document.getElementById('spf-details')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
}

chrome.storage.local.get(window.location.hostname, (result) => {
  const data = result[window.location.hostname];
  if (data && data.result) {
    injectWarningBanner(data.result.verdict, data.result.risk_score);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateWarning') {
    injectWarningBanner(message.verdict, message.riskScore);
    sendResponse({ success: true });
  }
});