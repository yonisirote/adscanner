import { detectAllAds } from './adDetector';
import type { DetectedAd, MessageAction, CheckUrlMessage, CheckUrlResponse } from '../types';

// Content script
console.log('[Content] Ad Scanner content script loaded on', window.location.href);

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
    
    try {
      const detectedAds = detectAllAds();
      console.log(`[Content] Found ${detectedAds.length} ads:`, detectedAds);
      
      // Send detected ads to background for storage
      chrome.runtime.sendMessage({
        action: 'UPDATE_DETECTED_ADS',
        ads: detectedAds,
      });
      
      // Check each ad URL with the backend API
      if (detectedAds.length > 0) {
        checkAdsWithBackend(detectedAds).then((checkedAds) => {
          console.log('[Content] All ads checked:', checkedAds);
          // Update background with checked ads
          chrome.runtime.sendMessage({
            action: 'UPDATE_DETECTED_ADS',
            ads: checkedAds,
          });
          sendResponse({ ads: checkedAds });
        }).catch((error) => {
          console.error('[Content] Error checking ads:', error);
          sendResponse({ ads: detectedAds, error: String(error) });
        });
        return true; // Will respond asynchronously
      } else {
        sendResponse({ ads: detectedAds });
      }
    } catch (error) {
      console.error('[Content] Error scanning for ads:', error);
      sendResponse({ ads: [], error: String(error) });
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
        action: 'CHECK_URL' as any,
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
  return checkedAds;
}

