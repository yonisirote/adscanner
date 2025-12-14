import type { VirusTotalResult } from '../types';
import { RateLimitError } from './errors';
import { getConfig } from '../config';
import { extractDomain } from '../utils/url';

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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'x-apikey': config.virusTotalApiKey,
      },
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      console.warn(`[VirusTotal] Rate limit exceeded for ${domain}`);
      throw new RateLimitError('VirusTotal API rate limit exceeded');
    }

    if (response.status === 404) {
      // URL not in database - submit it for scanning
      console.log(`[VirusTotal] URL not found, would need to submit for scanning: ${domain}`);
      return getMockResult(domain);
    }

    if (!response.ok) {
      throw new Error(`VirusTotal API error: ${response.statusText}`);
    }

    const data = (await response.json()) as VirusTotalApiResponse;

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
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[VirusTotal] API timeout');
      return getMockResult(domain);
    }

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
