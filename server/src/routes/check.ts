import { Hono } from 'hono';
import type { CheckRequest, CheckResponse } from '../types';
import { checkUrl as checkUrlVoid } from '../services/urlvoid';
import { checkUrl as checkUrlScamadvisor } from '../services/scamadvisor';
import { ApiError } from '../services/errors';
import { getCachedResult, setCachedResult } from '../services/cache';
import { buildUrlVoidSource, buildScamadvisorSource } from '../utils/sources';

/**
 * POST /api/check
 * Body: { url: string }
 * Response: CheckResponse (see src/types.ts)
 *
 * Validates URL, queries URLVoid and Scamadvisor APIs (or mock if no API keys).
 * Caches results for 24 hours. Returns risk score and detailed source data.
 */

const router = new Hono();

function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
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
    return c.json(
      { error: 'Invalid URL format' },
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

      const urlvoidSource = buildUrlVoidSource(cached.urlvoidResult);
      const scamadvisorSource = buildScamadvisorSource(cached.scamadvisorResult);

      sources.push(urlvoidSource);
      sources.push(scamadvisorSource);

      if (cached.urlvoidResult) {
        scores.push(cached.urlvoidResult.riskScore);
      }
      if (cached.scamadvisorResult) {
        scores.push(cached.scamadvisorResult.riskScore);
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

    const [urlVoidSettled, scamadvisorSettled] = await Promise.allSettled([
      checkUrlVoid(body.url),
      checkUrlScamadvisor(body.url),
    ]);

    const urlVoidResult = urlVoidSettled.status === 'fulfilled' ? urlVoidSettled.value : null;
    const scamadvisorResult = scamadvisorSettled.status === 'fulfilled' ? scamadvisorSettled.value : null;

    if (!urlVoidResult && !scamadvisorResult) {
      return c.json({ error: 'All reputation sources failed' }, { status: 502 });
    }

    const sources: CheckResponse['sources'] = [];
    const scores: number[] = [];

    const urlvoidSource = buildUrlVoidSource(urlVoidResult);
    const scamadvisorSource = buildScamadvisorSource(scamadvisorResult);

    sources.push(urlvoidSource);
    sources.push(scamadvisorSource);

    if (urlVoidResult) {
      scores.push(urlVoidResult.riskScore);
    }
    if (scamadvisorResult) {
      scores.push(scamadvisorResult.riskScore);
    }

    const riskScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const riskLevel = getRiskLevel(riskScore);

    // Cache the result
    await setCachedResult(body.url, urlVoidResult, scamadvisorResult, riskScore);

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
    console.error('Check error:', error);

    if (error instanceof ApiError) {
      return c.json({ error: error.message }, { status: error.statusCode as 400 | 404 | 429 | 500 });
    }

    return c.json({ error: 'Failed to check URL' }, { status: 500 });
  }
});

export default router;
