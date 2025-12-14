import { Hono } from 'hono';
import type { CheckRequest, CheckResponse } from '../types';
import { checkUrl as checkVirusTotal } from '../services/virusTotal';
import { checkUrl as checkGoogleSafeBrowsing } from '../services/googleSafeBrowsing';
import { ApiError } from '../services/errors';
import { getCachedResult, setCachedResult } from '../services/cache';
import { buildVirusTotalSource, buildGoogleSafeBrowsingSource } from '../utils/sources';

/**
 * POST /api/check
 * Body: { url: string }
 * Response: CheckResponse (see src/types.ts)
 *
 * Validates URL, queries VirusTotal and Google Safe Browsing APIs (or mock if no API keys).
 * Caches results for 24 hours. Returns risk score and detailed source data.
 */

const router = new Hono();

const MAX_URL_LENGTH = 2048; // Respect browser URL length limits

/**
 * Validate URL format and length
 * @param urlString URL to validate
 * @returns true if valid, false otherwise
 */
function isValidUrl(urlString: string): boolean {
  // Check length
  if (!urlString || urlString.length > MAX_URL_LENGTH) {
    return false;
  }

  // Check format
  try {
    const url = new URL(urlString);
    
    // Ensure protocol is http or https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

function getRiskLevel(score: number): 'safe' | 'low' | 'medium' | 'high' | 'dangerous' {
  if (score < 20) return 'safe';
  if (score < 40) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'dangerous';
}

router.post('/', async (c) => {
  let body: CheckRequest;
  try {
    body = await c.req.json<CheckRequest>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.url) {
    return c.json(
      { error: 'Missing required field: url' },
      { status: 400 }
    );
  }

  if (!isValidUrl(body.url)) {
    const errorMsg = !body.url || body.url.length > MAX_URL_LENGTH 
      ? `Invalid URL length (max ${MAX_URL_LENGTH} characters)`
      : 'Invalid URL format (must be http:// or https://)';
    
    return c.json(
      { 
        error: errorMsg,
        type: 'ValidationError',
      },
      { status: 400 }
    );
  }

  try {
    const startTime = Date.now();

    // Check cache first
    const cached = await getCachedResult(body.url);
    if (cached) {
      const sources: CheckResponse['sources'] = [];
      const scores: number[] = [];

      const virusTotalSource = buildVirusTotalSource(cached.virusTotalResult);
      const safeBrowsingSource = buildGoogleSafeBrowsingSource(cached.googleSafeBrowsingResult);

      sources.push(virusTotalSource);
      sources.push(safeBrowsingSource);

      if (cached.virusTotalResult) {
        scores.push(cached.virusTotalResult.riskScore);
      }
      if (cached.googleSafeBrowsingResult) {
        scores.push(cached.googleSafeBrowsingResult.riskScore);
      }

      const riskScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const riskLevel = getRiskLevel(riskScore);

      const duration = Date.now() - startTime;
      console.log(`[check] ${body.url} - cached hit (${duration}ms)`);

      const response: CheckResponse = {
        url: body.url,
        riskScore,
        riskLevel,
        sources,
        cached: true,
        checkedAt: cached.cachedAt,
      };

      return c.json(response);
    }

    const [virusTotalSettled, safeBrowsingSettled] = await Promise.allSettled([
      checkVirusTotal(body.url),
      checkGoogleSafeBrowsing(body.url),
    ]);

    const virusTotalResult = virusTotalSettled.status === 'fulfilled' ? virusTotalSettled.value : null;
    const safeBrowsingResult = safeBrowsingSettled.status === 'fulfilled' ? safeBrowsingSettled.value : null;

    if (!virusTotalResult && !safeBrowsingResult) {
      return c.json({ error: 'All reputation sources failed' }, { status: 502 });
    }

    const sources: CheckResponse['sources'] = [];
    const scores: number[] = [];

    const virusTotalSource = buildVirusTotalSource(virusTotalResult);
    const safeBrowsingSource = buildGoogleSafeBrowsingSource(safeBrowsingResult);

    sources.push(virusTotalSource);
    sources.push(safeBrowsingSource);

    if (virusTotalResult) {
      scores.push(virusTotalResult.riskScore);
    }
    if (safeBrowsingResult) {
      scores.push(safeBrowsingResult.riskScore);
    }

    const riskScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const riskLevel = getRiskLevel(riskScore);

    // Cache the result
    await setCachedResult(body.url, virusTotalResult, safeBrowsingResult, riskScore);

    const duration = Date.now() - startTime;
    console.log(`[check] ${body.url} - cache miss (${duration}ms)`);

    const response: CheckResponse = {
      url: body.url,
      riskScore,
      riskLevel,
      sources,
      cached: false,
      checkedAt: new Date().toISOString(),
    };

    return c.json(response);
  } catch (error) {
    console.error('[check] Error:', error);

    if (error instanceof ApiError) {
      const statusCode = error.statusCode as 400 | 404 | 429 | 500;
      const errorResponse: any = { 
        error: error.message,
        type: error.name,
      };
      
      // Add retry info for rate limits
      if (statusCode === 429) {
        console.warn('[check] API rate limit hit for URL:', body.url);
        errorResponse.retryAfter = 60; // Default retry after 1 minute
        errorResponse.hint = 'Upstream API rate limited. Try again in 60 seconds.';
      }
      
      return c.json(errorResponse, { status: statusCode });
    }

    return c.json({ 
      error: 'Failed to check URL',
      type: 'InternalServerError',
    }, { status: 500 });
  }
});

export default router;
