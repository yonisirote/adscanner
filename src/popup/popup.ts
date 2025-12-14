import type { DetectedAd, GetDetectedAdsMessage, GetDetectedAdsResponse, MessageAction } from '../types';

// Popup script
console.log('[Popup] Ad Scanner popup loaded');

const scanBtn = document.getElementById('scanBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const adCountSpan = document.getElementById('adCount');
const riskyCountSpan = document.getElementById('riskyCount');

let currentTabId: number | undefined;

// Get current tab on popup open
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.id) {
    currentTabId = tabs[0].id;
    // Try to load existing ads
    loadDetectedAds();
  }
});

/**
 * Format URL for display
 */
function formatUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

/**
 * Check if URL was unwrapped from tracking wrapper
 */
function wasUrlUnwrapped(rawUrl: string | undefined, extractedUrl: string | undefined): boolean {
  if (!rawUrl || !extractedUrl) return false;
  try {
    const rawParsed = new URL(rawUrl);
    const extractedParsed = new URL(extractedUrl);
    return rawParsed.hostname !== extractedParsed.hostname;
  } catch {
    return rawUrl !== extractedUrl;
  }
}

/**
 * Get icon for ad type
 */
function getTypeIcon(type: string): string {
  switch (type) {
    case 'iframe':
      return '📦';
    case 'script':
      return '📜';
    case 'link':
      return '🔗';
    case 'element':
      return '🏷️';
    default:
      return '📍';
  }
}

/**
 * Get risk badge HTML
 */
function getRiskBadge(ad: DetectedAd): string {
  if (ad.isChecking) {
    return '<span class="risk-badge checking">Checking...</span>';
  }
  
  if (!ad.riskLevel) {
    return '<span class="risk-badge" style="background: #f5f5f5; color: #999;">Not Checked</span>';
  }
  
  return `<span class="risk-badge ${ad.riskLevel}">${ad.riskLevel}</span>`;
}

/**
 * Count risky ads (medium, high, dangerous)
 */
function countRiskyAds(ads: DetectedAd[]): number {
  return ads.filter(ad => 
    ad.riskLevel === 'medium' || 
    ad.riskLevel === 'high' || 
    ad.riskLevel === 'dangerous'
  ).length;
}

/**
 * Update stats display
 */
function updateStats(ads: DetectedAd[]) {
  if (adCountSpan) {
    adCountSpan.textContent = ads.length.toString();
  }
  if (riskyCountSpan) {
    riskyCountSpan.textContent = countRiskyAds(ads).toString();
  }
}

/**
 * Display ads in the popup
 */
function displayAds(ads: DetectedAd[]) {
  if (!resultsDiv) return;

  updateStats(ads);

  if (ads.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p>No ads detected on this page.</p>
      </div>
    `;
    return;
  }

  let html = '';
  
  ads.forEach((ad) => {
    const unwrapped = wasUrlUnwrapped(ad.rawDestinationUrl, ad.extractedUrl);
    const displayUrl = ad.extractedUrl || ad.destinationUrl || ad.sourceUrl;
    const riskClass = ad.riskLevel ? `risk-${ad.riskLevel}` : '';
    
    html += `
      <div class="ad-item ${riskClass}">
        <div class="ad-header">
          <div class="ad-type">
            <span>${getTypeIcon(ad.type)}</span>
            <span>${ad.type.charAt(0).toUpperCase() + ad.type.slice(1)}</span>
            ${ad.network ? `<span class="ad-network">${ad.network}</span>` : ''}
          </div>
          ${getRiskBadge(ad)}
        </div>
        
        <div class="ad-url" title="${ad.sourceUrl}">
          ${formatUrl(ad.sourceUrl)}
        </div>
        
        ${ad.riskScore !== undefined ? `
          <div class="risk-score">
            Risk Score: ${ad.riskScore}/100
          </div>
        ` : ''}
        
        ${displayUrl && displayUrl !== ad.sourceUrl ? `
          <div class="ad-destination" title="${displayUrl}">
            ${unwrapped ? '<span class="unwrapped-badge">🔓 Unwrapped</span>' : '<span>→</span>'}
            <span>${formatUrl(displayUrl, 50)}</span>
          </div>
        ` : ''}
      </div>
    `;
  });

  resultsDiv.innerHTML = html;
}

/**
 * Load detected ads from background
 */
async function loadDetectedAds() {
  if (!currentTabId) {
    console.warn('[Popup] No current tab ID');
    return;
  }

  try {
    const message: GetDetectedAdsMessage = {
      action: 'GET_DETECTED_ADS' as any,
      tabId: currentTabId,
    };

    const response = await chrome.runtime.sendMessage(message) as GetDetectedAdsResponse;

    if (response.success) {
      console.log('[Popup] Loaded ads:', response.ads);
      displayAds(response.ads);
      
      if (response.ads.length > 0 && statusDiv) {
        statusDiv.textContent = `Found ${response.ads.length} ad${response.ads.length !== 1 ? 's' : ''}`;
      }
    } else {
      console.error('[Popup] Failed to load ads:', response.error);
    }
  } catch (error) {
    console.error('[Popup] Error loading ads:', error);
  }
}

/**
 * Scan page button handler
 */
if (scanBtn && statusDiv) {
  scanBtn.addEventListener('click', async () => {
    console.log('[Popup] Scan button clicked');
    statusDiv.textContent = 'Scanning page...';
    scanBtn.disabled = true;
    
    if (resultsDiv) {
      resultsDiv.innerHTML = '';
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.id) {
      currentTabId = tab.id;
      
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'SCAN' },
        (response) => {
          scanBtn.disabled = false;
          
          if (chrome.runtime.lastError) {
            console.error('[Popup] Error:', chrome.runtime.lastError);
            statusDiv.textContent = 'Error: Could not connect to page';
            return;
          }
          
          console.log('[Popup] Scan response:', response);
          
          if (response?.error) {
            statusDiv.textContent = `Error: ${response.error}`;
            if (resultsDiv) {
              resultsDiv.innerHTML = '';
            }
          } else {
            const ads: DetectedAd[] = response?.ads || [];
            statusDiv.textContent = ads.length
              ? `Found ${ads.length} ad${ads.length !== 1 ? 's' : ''}`
              : 'No ads found';
            displayAds(ads);
            
            // Poll for updates while ads are being checked
            if (ads.some(ad => ad.isChecking)) {
              pollForUpdates();
            }
          }
        }
      );
    }
  });
}

/**
 * Poll for updates while ads are being checked
 */
function pollForUpdates() {
  const interval = setInterval(async () => {
    if (!currentTabId) {
      clearInterval(interval);
      return;
    }

    try {
      const message: GetDetectedAdsMessage = {
        action: 'GET_DETECTED_ADS' as any,
        tabId: currentTabId,
      };

      const response = await chrome.runtime.sendMessage(message) as GetDetectedAdsResponse;

      if (response.success) {
        displayAds(response.ads);
        
        // Stop polling when all checks are complete
        if (!response.ads.some(ad => ad.isChecking)) {
          clearInterval(interval);
        }
      }
    } catch (error) {
      console.error('[Popup] Error polling for updates:', error);
      clearInterval(interval);
    }
  }, 1000); // Poll every second

  // Stop after 30 seconds max
  setTimeout(() => clearInterval(interval), 30000);
}
