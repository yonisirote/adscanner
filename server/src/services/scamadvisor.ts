import type { ScamadvisorResult } from '../types';
import { RateLimitError } from './errors';
import { getConfig } from '../config';
import { extractDomain } from '../utils/url';

interface ScamadvisorApiResponse {
  meta?: {
    domain: string;
    status: number;
  };
  data?: {
    domain: string;
    trust_score: number;
    country_code?: string;
    domain_age?: string;
    is_popular?: boolean;
    has_ssl?: boolean;
    risk_factors?: string[];
  };
  error?: {
    code: string;
    message: string;
  };
}

function invertTrustToRiskScore(trustScore: number): number {
  return 100 - trustScore;
}

/**
 * Query Scamadvisor API for URL reputation.
 * Returns normalized result with inverted risk score (0-100, higher = riskier).
 * Falls back to mock data if API key missing or request fails.
 */
export async function checkUrl(urlString: string): Promise<ScamadvisorResult> {
  const config = getConfig();

  const domain = extractDomain(urlString);

  if (!config.scamadvisorApiKey) {
    return getMockResult(domain);
  }

  try {
    const apiUrl = new URL('https://api.scamadviser.com/v2/trust/single');
    apiUrl.searchParams.append('url', urlString);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${config.scamadvisorApiKey}`,
      },
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      throw new RateLimitError();
    }

    if (!response.ok) {
      throw new Error(`Scamadvisor API error: ${response.statusText}`);
    }

    const data = (await response.json()) as ScamadvisorApiResponse;

    if (data.error) {
      if (data.error.code === 'auth_failed') {
        return getMockResult(domain);
      }
      throw new Error(`Scamadvisor API error: ${data.error.message}`);
    }

    if (!data.data) {
      return getMockResult(domain);
    }

    const trustScore = data.data.trust_score ?? 50;
    const riskScore = invertTrustToRiskScore(trustScore);

    return {
      domain,
      trustScore,
      riskScore,
      scanDate: new Date().toISOString(),
      details: {
        countryCode: data.data.country_code,
        isPopular: data.data.is_popular,
        hasSSL: data.data.has_ssl,
        domainAge: data.data.domain_age,
        riskFactors: data.data.risk_factors,
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Scamadvisor API timeout');
      return getMockResult(domain);
    }

    console.error('Scamadvisor API error:', error);
    return getMockResult(domain);
  }
}

/**
 * Fallback mock result for dev (no API key) or API failures.
 * Uses randomness - not suitable for deterministic tests.
 */
function getMockResult(domain: string): ScamadvisorResult {
  const trustScore = 40 + Math.floor(Math.random() * 60);
  const riskScore = invertTrustToRiskScore(trustScore);

  return {
    domain,
    trustScore,
    riskScore,
    scanDate: new Date().toISOString(),
    details: {},
  };
}
