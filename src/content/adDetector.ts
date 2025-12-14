import { DetectedAd } from '../types';
import { isAdDomain, getAdNetworkName } from '../data/adNetworks';
import { extractFinalUrl, parseTrackingUrl } from './urlExtractor';

let adCounter = 0;

function generateAdId(): string {
  return `ad-${Date.now()}-${++adCounter}`;
}

/**
 * Find ad iframes on the page
 */
export function findAdIframes(): DetectedAd[] {
  const ads: DetectedAd[] = [];
  const iframes = document.querySelectorAll('iframe');

  iframes.forEach((iframe) => {
    const src = iframe.src || iframe.getAttribute('data-src') || '';
    
    if (src && isAdDomain(src)) {
      const { rawUrl, extractedUrl } = extractFinalUrl(iframe);
      ads.push({
        id: generateAdId(),
        type: 'iframe',
        sourceUrl: src,
        rawDestinationUrl: rawUrl || undefined,
        extractedUrl: extractedUrl || undefined,
        destinationUrl: extractedUrl || rawUrl || undefined,
        element: iframe.id || iframe.className || 'iframe',
        network: getAdNetworkName(src),
      });
    }
  });

  return ads;
}

/**
 * Find ad scripts on the page
 */
export function findAdScripts(): DetectedAd[] {
  const ads: DetectedAd[] = [];
  const scripts = document.querySelectorAll('script');

  scripts.forEach((script) => {
    const src = script.src || '';
    
    if (src && isAdDomain(src)) {
      const extracted = parseTrackingUrl(src);
      ads.push({
        id: generateAdId(),
        type: 'script',
        sourceUrl: src,
        rawDestinationUrl: src,
        extractedUrl: extracted || src,
        destinationUrl: extracted || src,
        element: script.id || 'script',
        network: getAdNetworkName(src),
      });
    }
  });

  return ads;
}

/**
 * Find sponsored/affiliate links
 */
export function findAdLinks(): DetectedAd[] {
  const ads: DetectedAd[] = [];
  const links = document.querySelectorAll('a');

  links.forEach((link) => {
    const href = link.href || '';
    const text = (link.textContent || '').toLowerCase();
    const title = (link.title || '').toLowerCase();
    const className = (link.className || '').toLowerCase();
    
    // Check for sponsored/affiliate keywords
    const isSponsoredLink =
      text.includes('sponsored') ||
      text.includes('ad') ||
      title.includes('sponsored') ||
      title.includes('advertisement') ||
      className.includes('sponsored') ||
      className.includes('ad-') ||
      link.hasAttribute('data-sponsored') ||
      link.hasAttribute('data-affiliate');

    if (isSponsoredLink && href) {
      const { rawUrl, extractedUrl } = extractFinalUrl(link);
      ads.push({
        id: generateAdId(),
        type: 'link',
        sourceUrl: href,
        rawDestinationUrl: rawUrl || href,
        extractedUrl: extractedUrl || href,
        destinationUrl: extractedUrl || rawUrl || href,
        element: link.id || `[${link.textContent?.substring(0, 20)}]` || 'a',
        network: isAdDomain(href) ? getAdNetworkName(href) : undefined,
      });
    }
  });

  return ads;
}

/**
 * Find elements with ad-related attributes
 */
export function findAdsByAttributes(): DetectedAd[] {
  const ads: DetectedAd[] = [];
  
  const adSelectors = [
    '[class*="ad-"]',
    '[class*="ads"]',
    '[class*="advertisement"]',
    '[class*="advert"]',
    '[id*="ad-"]',
    '[id*="ads"]',
    '[data-ad-network]',
    '[data-ad-url]',
    '.sponsor',
    '.sponsored',
    '.promotion',
    '.promo',
  ];

  adSelectors.forEach((selector) => {
    const elements = document.querySelectorAll(selector);
    
    elements.forEach((el) => {
      // Skip if already detected as iframe or script
      if (el.tagName === 'IFRAME' || el.tagName === 'SCRIPT') {
        return;
      }

      const url = el.getAttribute('data-ad-url') || '';
      const network = el.getAttribute('data-ad-network') || '';
      
      // Only add if it has some ad-related attributes
      if (url || network) {
        const { rawUrl, extractedUrl } = extractFinalUrl(el);
        ads.push({
          id: generateAdId(),
          type: 'element',
          sourceUrl: url || network,
          rawDestinationUrl: rawUrl || undefined,
          extractedUrl: extractedUrl || undefined,
          destinationUrl: extractedUrl || rawUrl || undefined,
          element: el.id || el.className || el.tagName,
          network: network || undefined,
        });
      }
    });
  });

  return ads;
}

/**
 * Extract destination URL from an ad element
 */
export function extractDestinationUrl(element: HTMLElement): string | undefined {
  if (element instanceof HTMLAnchorElement) {
    return element.href;
  }
  
  if (element instanceof HTMLIFrameElement) {
    return element.src;
  }

  // Check for data attributes
  const dataUrl = element.getAttribute('data-url') || element.getAttribute('data-href');
  if (dataUrl) {
    return dataUrl;
  }

  return undefined;
}

/**
 * Detect all ads on the page
 */
export function detectAllAds(): DetectedAd[] {
  const iframes = findAdIframes();
  const scripts = findAdScripts();
  const links = findAdLinks();
  const attributes = findAdsByAttributes();

  const allAds = [...iframes, ...scripts, ...links, ...attributes];

  // Deduplicate by sourceUrl
  const seen = new Set<string>();
  const dedupedAds: DetectedAd[] = [];

  allAds.forEach((ad) => {
    const key = `${ad.type}-${ad.sourceUrl}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedAds.push(ad);
    }
  });

  return dedupedAds;
}
