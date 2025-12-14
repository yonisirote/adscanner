import { checkUrl } from '../services/api';
import { MessageAction } from '../types';
import type { CheckUrlMessage, CheckUrlResponse, GetDetectedAdsMessage, GetDetectedAdsResponse, DetectedAd } from '../types';

// Background service worker
console.log('[Background] Ad Scanner service worker loaded');

// Store detected ads per tab
const detectedAdsByTab = new Map<number, DetectedAd[]>();

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Extension installed');
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedAdsByTab.delete(tabId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Message received:', request);

  // Handle CHECK_URL messages
  if (request.action === MessageAction.CHECK_URL) {
    const message = request as CheckUrlMessage;

    // Use async handler for API call
    handleCheckUrl(message, sender.tab?.id)
      .then(sendResponse)
      .catch((error) => {
        console.error('[Background] Error checking URL:', error);
        sendResponse({
          success: false,
          adId: message.adId,
          error: error.message || 'Failed to check URL',
        } as CheckUrlResponse);
      });

    // Return true to indicate async response
    return true;
  }

  // Handle GET_DETECTED_ADS messages
  if (request.action === MessageAction.GET_DETECTED_ADS) {
    const message = request as GetDetectedAdsMessage;
    const ads = detectedAdsByTab.get(message.tabId) || [];

    sendResponse({
      success: true,
      ads: ads,
    } as GetDetectedAdsResponse);

    return false;
  }

  // Handle UPDATE_DETECTED_ADS messages
  if (request.action === MessageAction.UPDATE_DETECTED_ADS && sender.tab?.id) {
    detectedAdsByTab.set(sender.tab.id, request.ads || []);
    sendResponse({ success: true });
    return false;
  }

  sendResponse({ status: 'acknowledged' });
  return false;
});

async function handleCheckUrl(message: CheckUrlMessage, tabId?: number): Promise<CheckUrlResponse> {
  try {
    console.log(`[Background] Checking URL: ${message.url}`);
    const result = await checkUrl(message.url);
    console.log(`[Background] Result for ${message.url}:`, result);

    // Update the ad in storage if we have a tabId
    if (tabId !== undefined) {
      const ads = detectedAdsByTab.get(tabId) || [];
      const adIndex = ads.findIndex(ad => ad.id === message.adId);

      if (adIndex !== -1) {
        ads[adIndex] = {
          ...ads[adIndex],
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          isChecking: false,
        };
        detectedAdsByTab.set(tabId, ads);
      } else {
        // Ad not found, might be a new ad being checked
        // This shouldn't normally happen, but we can add it
        console.warn(`[Background] Ad ${message.adId} not found in tab ${tabId}, adding it`);
      }
    }

    return {
      success: true,
      adId: message.adId,
      data: result,
    };
  } catch (error: any) {
    throw error;
  }
}

