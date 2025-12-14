import { detectAllAds } from './adDetector';
import { injectStyles, addOverlay, removeAllBadges } from './adOverlay';
import { MessageAction } from '../types';
import type { DetectedAd, CheckUrlMessage, CheckUrlResponse } from '../types';

import { isWhitelisted } from '../services/storage';

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
    // Handle async scan
    (async () => {
      console.log('[Content] Scanning page for ads...');

      if (await isWhitelisted(window.location.href)) {
        console.log('[Content] Page is whitelisted. Skipping scan.');
        sendResponse({
          ads: [],
          error: 'This site is whitelisted in settings.',
          errorType: 'client_error'
        });
        return;
      }

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
    })();
    return true;
  }
  return true;
});

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check a single ad with the backend API
 */
async function checkSingleAd(ad: DetectedAd): Promise<DetectedAd> {
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
}

/**
 * Check all detected ads with the backend API
 * Uses batching to respect VirusTotal rate limits (4 req/min on free tier)
 */
async function checkAdsWithBackend(ads: DetectedAd[]): Promise<DetectedAd[]> {
  const checkedAds = [...ads];

  // Mark all as checking
  checkedAds.forEach(ad => ad.isChecking = true);

  // Process in batches of 4 to respect VirusTotal's rate limit
  const BATCH_SIZE = 4;
  const BATCH_DELAY_MS = 1500; // 1.5s between batches for safety margin

  for (let i = 0; i < checkedAds.length; i += BATCH_SIZE) {
    const batch = checkedAds.slice(i, i + BATCH_SIZE);

    console.log(`[Content] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(checkedAds.length / BATCH_SIZE)}`);

    // Process batch in parallel
    await Promise.all(batch.map(ad => checkSingleAd(ad)));

    // Update background with progress after each batch
    chrome.runtime.sendMessage({
      action: 'UPDATE_DETECTED_ADS',
      ads: checkedAds,
    }).catch(() => { });

    // Delay before next batch (unless this was the last batch)
    if (i + BATCH_SIZE < checkedAds.length) {
      console.log(`[Content] Rate limiting: waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await delay(BATCH_DELAY_MS);
    }
  }

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

