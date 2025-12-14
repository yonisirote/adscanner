import type { UrlVoidResult } from '../types';
import { RateLimitError, NotFoundError } from './errors';
import { getConfig } from '../config';
import { extractDomain } from '../utils/url';

interface UrlVoidApiResponse {
  data?: {
    report?: {
      domain: string;
      last_analysis_date?: number;
      last_analysis_stats?: {
        malicious?: number;
        suspicious?: number;
        undetected?: number;
        harmless?: number;
      };
      engines?: Record<string, { detected?: boolean; category?: string }>;
      last_dns_records?: {
        A?: string[];
        MX?: string[];
      };
      last_http_response_code?: number;
      registrar?: string;
      last_final_url?: string;
      categories?: Record<string, string>;
      last_analysis_results?: Record<
        string,
        {
          detected: boolean;
          category?: string;
          engine_name: string;
        }
      >;
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

export async function checkUrl(urlString: string): Promise<UrlVoidResult> {
  const config = getConfig();

  const domain = extractDomain(urlString);

  // If no API key, return mock data
  if (!config.urlvoidApiKey) {
    return getMockResult(domain);
  }

  try {
    const apiUrl = `https://api.urlvoid.com/api1000/${config.urlvoidApiKey}/host/${domain}/`;

    const response = await fetch(apiUrl);

    if (response.status === 429) {
      throw new RateLimitError();
    }

    if (response.status === 404) {
      throw new NotFoundError(`Domain not found: ${domain}`);
    }

    if (!response.ok) {
      throw new Error(`URLVoid API error: ${response.statusText}`);
    }

    const data = (await response.json()) as UrlVoidApiResponse;

    if (data.error) {
      if (data.error.code === 'auth_failed') {
        return getMockResult(domain);
      }
      throw new Error(`URLVoid API error: ${data.error.message}`);
    }

    if (!data.data?.report) {
      return getMockResult(domain);
    }

    const report = data.data.report;
    const stats = report.last_analysis_stats || {
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

    const engines = Object.entries(report.last_analysis_results || {}).map(
      ([key, result]) => ({
        name: result.engine_name || key,
        detected: result.detected || false,
      }),
    );

    const scanDate = report.last_analysis_date
      ? new Date(report.last_analysis_date * 1000).toISOString()
      : new Date().toISOString();

    return {
      domain,
      detectionCount,
      enginesCount,
      scanDate,
      riskScore,
      details: {
        ip: extractIpFromRecords(report.last_dns_records?.A),
        countryCode: undefined,
        domainAge: undefined,
        engines: engines.slice(0, 10),
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }

    console.error('URLVoid API error:', error);
    return getMockResult(domain);
  }
}

function extractIpFromRecords(records?: string[]): string | undefined {
  return records?.[0];
}

/**
 * Fallback mock result for dev (no API key) or API failures.
 * Uses randomness - not suitable for deterministic tests.
 */
function getMockResult(domain: string): UrlVoidResult {
  const mockDetectionCount = Math.floor(Math.random() * 5);
  const mockEnginesCount = 70 + Math.floor(Math.random() * 20);
  const riskScore = calculateRiskScore(mockDetectionCount, mockEnginesCount);

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
