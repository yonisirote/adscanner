import type { VirusTotalResult } from '../types';
import { RateLimitError, NetworkError, TimeoutError } from './errors';
import { getConfig } from '../config';
import { extractDomain } from '../utils/url';
import { retryWithBackoff } from '../utils/retry';

interface VirusTotalApiResponse {
  data?: {
    attributes?: {
      last_analysis_date?: number;
      last_analysis_stats?: {
        malicious?: number;
        suspicious?: number;
        undetected?: number;
        harmless?: number;
      };
      last_analysis_results?: Record<
        string,
        {
          category: string;
          engine_name: string;
          result?: string;
        }
      >;
      last_final_url?: string;
      categories?: Record<string, string>;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

function calculateRiskScore(detectionCount: number, enginesCount: number): number {
  if (enginesCount === 0) return 0;
  return (detectionCount / enginesCount) * 100;
}

/**
 * Query VirusTotal API v3 for URL reputation.
 * Returns normalized result with risk score (0-100, higher = riskier).
 * Falls back to mock data if API key missing or request fails.
 * 
 * @param urlString The URL to check for threats
 * @returns Promise<VirusTotalResult> Risk analysis from VirusTotal
 * @throws RateLimitError if API rate limit exceeded
 * 
 * Free tier: 500 requests/day, 4 requests/minute
 * API Docs: https://developers.virustotal.com/reference/url-info
 */
export async function checkUrl(urlString: string): Promise<VirusTotalResult> {
  const config = getConfig();
  const domain = extractDomain(urlString);

  // If no API key, return mock data
  if (!config.virusTotalApiKey) {
    return getMockResult(domain);
  }

  try {
    // VirusTotal requires URL to be base64 encoded without padding
    const urlId = Buffer.from(urlString).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const apiUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;

    // Perform validation with retries
    const data = await retryWithBackoff<VirusTotalApiResponse>(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(apiUrl, {
          signal: controller.signal,
          headers: {
            'x-apikey': config.virusTotalApiKey,
          },
        });

        if (response.status === 429) {
          throw new RateLimitError('VirusTotal API rate limit exceeded');
        }

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          throw new NetworkError(`VirusTotal server error: ${response.status}`);
        }

        if (response.status === 404) {
          // Special case: 404 means URL not found in VT, treat as "no info" (safe-ish?)
          // We return null to signal "not found" to the outer scope, which isn't an error
          return { error: { code: 'NotFoundError', message: 'URL not found' } } as any;
        }

        if (!response.ok) {
          throw new Error(`VirusTotal API error: ${response.statusText}`);
        }

        return (await response.json()) as VirusTotalApiResponse;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimeoutError('VirusTotal API timeout');
        }
        // Re-throw known errors directly
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }, {
      retries: 2, // 3 attempts total
      shouldRetry: (error) => {
        // Retry on Network/Timeout/5xx, but NOT on RateLimit or Auth errors
        return error instanceof NetworkError || error instanceof TimeoutError;
      }
    });

    // Handle special "Not Found" case from logic above
    if (data.error?.code === 'NotFoundError') {
      console.log(`[VirusTotal] URL not found, would need to submit for scanning: ${domain}`);
      return getMockResult(domain);
    }

    if (data.error) {
      if (data.error.code === 'AuthenticationRequiredError') {
        console.warn('[VirusTotal] Authentication failed, using mock data');
        return getMockResult(domain);
      }
      throw new Error(`VirusTotal API error: ${data.error.message}`);
    }

    if (!data.data?.attributes) {
      return getMockResult(domain);
    }

    const attrs = data.data.attributes;
    const stats = attrs.last_analysis_stats || {
      malicious: 0,
      suspicious: 0,
      undetected: 0,
      harmless: 0,
    };

    const detectionCount = (stats.malicious || 0) + (stats.suspicious || 0);
    const enginesCount =
      (stats.malicious || 0) +
      (stats.suspicious || 0) +
      (stats.undetected || 0) +
      (stats.harmless || 0);

    const riskScore = calculateRiskScore(detectionCount, enginesCount);

    const engines = Object.entries(attrs.last_analysis_results || {})
      .map(([key, result]) => ({
        name: result.engine_name || key,
        detected: result.category === 'malicious' || result.category === 'suspicious',
      }))
      .slice(0, 10);

    const scanDate = attrs.last_analysis_date
      ? new Date(attrs.last_analysis_date * 1000).toISOString()
      : new Date().toISOString();

    console.log(`[VirusTotal] ${domain} -> ${detectionCount}/${enginesCount} detections (score: ${riskScore.toFixed(1)})`);

    return {
      domain,
      detectionCount,
      enginesCount,
      scanDate,
      riskScore,
      details: {
        engines,
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Propagate rate limit errors to client
      throw error;
    }

    // Fallback to mock for other errors
    console.error('[VirusTotal] API error:', error);
    return getMockResult(domain);
  }
}

/**
 * Fallback mock result for dev (no API key) or API failures.
 * Uses domain-based logic for consistent testing.
 */
function getMockResult(domain: string): VirusTotalResult {
  // Create deterministic but varied results based on domain
  const domainHash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  // High risk domains (for testing)
  const highRiskKeywords = ['ads', 'doubleclick', 'adserver', 'adnetwork', 'click', 'tracking', 'dangerous', 'risky'];
  const isHighRisk = highRiskKeywords.some(keyword => domain.includes(keyword));

  let mockDetectionCount: number;
  let mockEnginesCount = 88;

  if (isHighRisk) {
    // High risk: 30-70 detections
    mockDetectionCount = 30 + (domainHash % 40);
  } else if (domain.includes('example') || domain.includes('test') || domain.includes('medium')) {
    // Medium risk: 15-35 detections
    mockDetectionCount = 15 + (domainHash % 20);
  } else {
    // Low/safe: 0-10 detections
    mockDetectionCount = domainHash % 11;
  }

  const riskScore = calculateRiskScore(mockDetectionCount, mockEnginesCount);

  console.log(`[VirusTotal Mock] ${domain} -> ${mockDetectionCount}/${mockEnginesCount} detections (score: ${riskScore.toFixed(1)})`);

  return {
    domain,
    detectionCount: mockDetectionCount,
    enginesCount: mockEnginesCount,
    scanDate: new Date().toISOString(),
    riskScore,
    details: {
      engines: [],
    },
  };
}
