import { detectAllAds } from './adDetector';
import { injectStyles, addOverlay, removeAllBadges } from './adOverlay';
import type { DetectedAd, MessageAction, CheckUrlMessage, CheckUrlResponse } from '../types';

// Content script
console.log('[Content] Ad Scanner content script loaded on', window.location.href);

// Inject overlay styles on load
injectStyles();

// Map to track ad elements for overlay injection
const adElementMap = new Map<string, Element>();

// Send message to background
chrome.runtime.sendMessage(
  { type: 'PAGE_LOADED', url: window.location.href },
  (response) => {
    if (response) {
      console.log('[Content] Response from background:', response);
    }
  }
);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Content] Message from popup:', request);
  if (request.type === 'SCAN') {
    console.log('[Content] Scanning page for ads...');
    
    // Clean up previous overlays
    removeAllBadges();
    adElementMap.clear();
    
    try {
       const detectedAds = detectAllAds();
       console.log(`[Content] Found ${detectedAds.length} ads:`, detectedAds);
       
       // Send detected ads to background for storage
       chrome.runtime.sendMessage({
         action: 'UPDATE_DETECTED_ADS',
         ads: detectedAds,
       }).catch((error) => {
         console.warn('[Content] Failed to update background with detected ads:', error);
       });
       
       // Check each ad URL with the backend API
       if (detectedAds.length > 0) {
         checkAdsWithBackend(detectedAds)
           .then((checkedAds) => {
             console.log('[Content] All ads checked:', checkedAds);
             // Update background with checked ads
             chrome.runtime.sendMessage({
               action: 'UPDATE_DETECTED_ADS',
               ads: checkedAds,
             }).catch((error) => {
               console.warn('[Content] Failed to update background with checked ads:', error);
             });
             sendResponse({ ads: checkedAds });
           })
           .catch((error) => {
             console.error('[Content] Error checking ads:', error);
             // Return original ads even if checking failed
             sendResponse({ 
               ads: detectedAds, 
               error: 'Failed to check ad security. Showing unscored results.',
               originalError: String(error),
             });
           });
         return true; // Will respond asynchronously
       } else {
         sendResponse({ ads: detectedAds });
       }
     } catch (error) {
       console.error('[Content] Error scanning for ads:', error);
       sendResponse({ 
         ads: [], 
         error: 'Failed to scan page for ads',
         originalError: String(error),
       });
     }
  }
  return true;
});

/**
 * Check all detected ads with the backend API
 */
async function checkAdsWithBackend(ads: DetectedAd[]): Promise<DetectedAd[]> {
  const checkedAds = [...ads];

  // Mark all as checking
  checkedAds.forEach(ad => ad.isChecking = true);

  // Check URLs in parallel (limit to avoid overwhelming the API)
  const promises = checkedAds.map(async (ad) => {
    const urlToCheck = ad.destinationUrl || ad.sourceUrl;
    
    if (!urlToCheck) {
      ad.isChecking = false;
      return ad;
    }

    try {
      console.log(`[Content] Checking URL for ad ${ad.id}: ${urlToCheck}`);
      
      const message: CheckUrlMessage = {
        action: MessageAction.CHECK_URL,
        url: urlToCheck,
        adId: ad.id,
      };

      const response = await chrome.runtime.sendMessage(message) as CheckUrlResponse;

      if (response.success && response.data) {
        ad.riskScore = response.data.riskScore;
        ad.riskLevel = response.data.riskLevel;
        console.log(`[Content] Ad ${ad.id} risk: ${ad.riskLevel} (${ad.riskScore})`);
      } else {
        console.warn(`[Content] Failed to check ad ${ad.id}:`, response.error);
      }
    } catch (error) {
      console.error(`[Content] Error checking ad ${ad.id}:`, error);
    } finally {
      ad.isChecking = false;
    }

    return ad;
  });

  await Promise.all(promises);
  
  // Add overlays to risky ads
  addOverlaysToAds(checkedAds);
  
  return checkedAds;
}

/**
 * Find and add overlays to ad elements
 */
function addOverlaysToAds(ads: DetectedAd[]): void {
  ads.forEach(ad => {
    if (!ad.riskLevel || ad.riskLevel === 'safe' || ad.riskLevel === 'low') {
      return; // Skip safe/low risk ads
    }

    // Find the element based on ad type and identifiers
    let element: Element | null = null;

    if (ad.type === 'iframe') {
      const iframes = document.querySelectorAll('iframe');
      for (const iframe of iframes) {
        if (iframe.src === ad.sourceUrl) {
          element = iframe;
          break;
        }
      }
    } else if (ad.type === 'script') {
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.src === ad.sourceUrl) {
          element = script.parentElement; // Use parent since script itself isn't visible
          break;
        }
      }
    } else if (ad.type === 'link') {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.href === ad.sourceUrl) {
          element = link;
          break;
        }
      }
    } else if (ad.type === 'element') {
      // Try to find by data-ad-url or other attributes
      const candidates = document.querySelectorAll('[data-ad-url], [data-ad-network], [class*="ad-"], [id*="ad-"]');
      for (const candidate of candidates) {
        const dataUrl = candidate.getAttribute('data-ad-url');
        if (dataUrl === ad.sourceUrl) {
          element = candidate;
          break;
        }
      }
    }

    if (element && element instanceof HTMLElement) {
      try {
        addOverlay(ad, element);
        adElementMap.set(ad.id, element);
        console.log(`[Content] Added overlay to ad ${ad.id}`);
      } catch (error) {
        console.error(`[Content] Error adding overlay to ad ${ad.id}:`, error);
      }
    } else {
      console.warn(`[Content] Could not find element for ad ${ad.id} (${ad.type})`);
    }
  });
}

