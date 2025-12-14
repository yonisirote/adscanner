/**
 * URL Extraction utilities for unwrapping tracking/redirect URLs
 */

/**
 * Common URL parameters that contain destination URLs
 */
const DESTINATION_PARAMS = ['url', 'dest', 'destination', 'redirect', 'target', 'u', 'link', 'goto'];

/**
 * Decode a URL that may be double-encoded or base64-encoded
 */
export function decodeUrlParam(encoded: string): string {
  let result = encoded;
  
  // Try base64 decode first (if it looks like base64)
  if (/^[A-Za-z0-9+/=]+$/.test(result) && result.length > 20) {
    try {
      const decoded = atob(result);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        result = decoded;
      }
    } catch {
      // Not valid base64, continue
    }
  }
  
  // Decode URL encoding (handle double-encoding by looping)
  let previous = '';
  let iterations = 0;
  const maxIterations = 5;
  
  while (result !== previous && iterations < maxIterations) {
    previous = result;
    try {
      result = decodeURIComponent(result);
    } catch {
      break;
    }
    iterations++;
  }
  
  return result;
}

/**
 * Parse Google tracking URLs (aclk, adurl patterns)
 */
function parseGoogleTrackingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Google Ads click tracking: google.com/aclk?...&adurl=
    if (parsed.hostname.includes('google') && parsed.pathname.includes('/aclk')) {
      const adurl = parsed.searchParams.get('adurl');
      if (adurl) {
        return decodeUrlParam(adurl);
      }
    }
    
    // Google search ads: google.com/url?...&url= or &q=
    if (parsed.hostname.includes('google') && parsed.pathname === '/url') {
      const destUrl = parsed.searchParams.get('url') || parsed.searchParams.get('q');
      if (destUrl) {
        return decodeUrlParam(destUrl);
      }
    }
    
    // DoubleClick/Google Ad Manager
    if (parsed.hostname.includes('doubleclick.net')) {
      const adurl = parsed.searchParams.get('adurl') || parsed.searchParams.get('ds_dest_url');
      if (adurl) {
        return decodeUrlParam(adurl);
      }
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Parse Facebook tracking URLs (l.php patterns)
 */
function parseFacebookTrackingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Facebook link shim: l.facebook.com/l.php?u=
    if (parsed.hostname.includes('facebook.com') && parsed.pathname.includes('/l.php')) {
      const u = parsed.searchParams.get('u');
      if (u) {
        return decodeUrlParam(u);
      }
    }
    
    // Facebook external link wrapper
    if (parsed.hostname === 'lm.facebook.com' || parsed.hostname === 'l.facebook.com') {
      const u = parsed.searchParams.get('u');
      if (u) {
        return decodeUrlParam(u);
      }
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Parse generic tracking URLs with common destination params
 */
function parseGenericTrackingUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    for (const param of DESTINATION_PARAMS) {
      const value = parsed.searchParams.get(param);
      if (value && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('%'))) {
        const decoded = decodeUrlParam(value);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return decoded;
        }
      }
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Parse a tracking URL and extract the real destination
 * Tries multiple extraction strategies in order
 */
export function parseTrackingUrl(url: string): string | null {
  if (!url) return null;
  
  // Try Google patterns
  const googleResult = parseGoogleTrackingUrl(url);
  if (googleResult) return googleResult;
  
  // Try Facebook patterns
  const facebookResult = parseFacebookTrackingUrl(url);
  if (facebookResult) return facebookResult;
  
  // Try generic patterns
  const genericResult = parseGenericTrackingUrl(url);
  if (genericResult) return genericResult;
  
  return null;
}

/**
 * Resolve a relative URL against a base URL
 */
export function resolveRelativeUrl(url: string, base?: string): string {
  if (!url) return '';
  
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Use current location as base if not provided
  const baseUrl = base || (typeof window !== 'undefined' ? window.location.href : '');
  
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Extract the final destination URL from an ad element
 * Returns both the raw URL and the extracted (unwrapped) URL
 */
export function extractFinalUrl(element: Element): { rawUrl: string | null; extractedUrl: string | null } {
  let rawUrl: string | null = null;
  
  // Check for anchor element
  if (element instanceof HTMLAnchorElement) {
    rawUrl = element.href;
  } else if (element instanceof HTMLIFrameElement) {
    rawUrl = element.src;
  } else {
    // Check data attributes
    rawUrl = element.getAttribute('data-url') 
      || element.getAttribute('data-href')
      || element.getAttribute('data-destination')
      || element.getAttribute('href');
    
    // Look for nested anchor
    const anchor = element.querySelector('a');
    if (!rawUrl && anchor) {
      rawUrl = anchor.href;
    }
  }
  
  if (!rawUrl) {
    return { rawUrl: null, extractedUrl: null };
  }
  
  // Resolve relative URLs
  rawUrl = resolveRelativeUrl(rawUrl);
  
  // Try to extract from tracking wrapper
  const extractedUrl = parseTrackingUrl(rawUrl);
  
  return {
    rawUrl,
    extractedUrl: extractedUrl || rawUrl
  };
}

/**
 * Check if a URL was unwrapped from a tracking URL
 */
export function wasUrlUnwrapped(rawUrl: string | undefined, extractedUrl: string | undefined): boolean {
  if (!rawUrl || !extractedUrl) return false;
  
  try {
    const rawParsed = new URL(rawUrl);
    const extractedParsed = new URL(extractedUrl);
    return rawParsed.hostname !== extractedParsed.hostname;
  } catch {
    return rawUrl !== extractedUrl;
  }
}
