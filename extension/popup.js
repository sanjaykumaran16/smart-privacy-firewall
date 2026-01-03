const API_URL = 'http://localhost:3000/api';
const USER_ID = 1;

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function findPrivacyPolicyUrl(domain) {
  const commonPaths = [
    '/privacy',
    '/privacy-policy',
    '/privacy.html',
    '/legal/privacy',
    '/privacy-notice',
    '/privacypolicy'
  ];
  
  for (const path of commonPaths) {
    const url = `https://${domain}${path}`;
    try {
        const response = await fetch(url, { method: 'GET', redirect: 'follow' });
      if (response.ok) {
        return url;
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

async function analyzePolicy(policyUrl) {
  const response = await fetch(`${API_URL}/analyze-policy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      policyUrl,
      userId: USER_ID
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Analysis failed');
  }
  
  return await response.json();
}

function renderStatus(result) {
  const content = document.getElementById('content');
  
  const statusClass = result.verdict.toLowerCase();
  const icons = {
    'SAFE': '✅',
    'WARNING': '⚠️',
    'BLOCKED': '🚫'
  };
  
  const messages = {
    'SAFE': 'Privacy Policy Looks Good',
    'WARNING': 'Privacy Concerns Found',
    'BLOCKED': 'High Privacy Risk Detected'
  };
  
  let html = `
    <div class="domain-info">
      Analyzing: ${result.domain}
    </div>
    <div class="status ${statusClass}">
      <div class="status-icon">${icons[result.verdict]}</div>
      <div class="status-text">${messages[result.verdict]}</div>
      <div class="risk-score">Risk Score: ${result.risk_score}/100</div>
    </div>
  `;
  
  if (result.violations && result.violations.length > 0) {
    html += '<div class="violations">';
    html += '<h3>Issues Found:</h3>';
    
    result.violations.forEach(violation => {
      const practiceName = violation.practice.replace(/_/g, ' ');
      html += `
        <div class="violation-item">
          <div class="violation-practice">${practiceName}</div>
          <div>Status: ${violation.status}</div>
          <div class="violation-evidence">"${violation.evidence.substring(0, 100)}..."</div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  html += '<button id="reanalyze">Re-analyze</button>';
  
  content.innerHTML = html;
  
  document.getElementById('reanalyze').addEventListener('click', initAnalysis);
}

function renderError(message) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="error">
      <strong>Error:</strong> ${message}
    </div>
    <button id="retry">Try Again</button>
  `;
  
  document.getElementById('retry').addEventListener('click', initAnalysis);
}

function renderLoading(message = 'Analyzing privacy policy...') {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="status loading">
      <div class="status-icon">⏳</div>
      <div class="status-text">${message}</div>
    </div>
  `;
}

async function initAnalysis() {
  try {
    renderLoading('Getting current page...');
    
    const tab = await getCurrentTab();
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    renderLoading('Finding privacy policy...');
    
    const policyUrl = await findPrivacyPolicyUrl(domain);
    
    if (!policyUrl) {
      renderError('Could not find privacy policy. Please navigate to the privacy policy page directly.');
      return;
    }
    
    renderLoading('Analyzing privacy policy...');
    
    const result = await analyzePolicy(policyUrl);
    
    renderStatus(result);
    
    chrome.storage.local.set({
      [domain]: {
        result,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    renderError(error.message || 'An unexpected error occurred');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const tab = await getCurrentTab();
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    const stored = await chrome.storage.local.get(domain);
    
    if (stored[domain] && (Date.now() - stored[domain].timestamp < 86400000)) {
      renderStatus(stored[domain].result);
    } else {
      initAnalysis();
    }
  } catch (error) {
    renderError('Failed to initialize extension');
  }
});