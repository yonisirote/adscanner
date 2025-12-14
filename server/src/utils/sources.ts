import type { SourceResult, VirusTotalResult, GoogleSafeBrowsingResult } from '../types';

/**
 * Build a source result from VirusTotal API response.
 * Returns error details if result is null.
 */
export function buildVirusTotalSource(result: VirusTotalResult | null): SourceResult {
  if (result) {
    return {
      source: 'virustotal',
      score: result.riskScore,
      details: {
        detectionCount: result.detectionCount,
        enginesCount: result.enginesCount,
        scanDate: result.scanDate,
        categories: result.details.categories,
        reputation: result.details.reputation,
        engines: result.details.engines?.slice(0, 5),
      },
    };
  } else {
    return {
      source: 'virustotal',
      score: 0,
      details: { error: 'Service unavailable' },
    };
  }
}

/**
 * Build a source result from Google Safe Browsing API response.
 * Returns error details if result is null.
 */
export function buildGoogleSafeBrowsingSource(result: GoogleSafeBrowsingResult | null): SourceResult {
  if (result) {
    return {
      source: 'google-safe-browsing',
      score: result.riskScore,
      details: {
        isSafe: result.details.isSafe,
        threatTypes: result.threatTypes,
        scanDate: result.scanDate,
        platformTypes: result.details.platformTypes,
      },
    };
  } else {
    return {
      source: 'google-safe-browsing',
      score: 0,
      details: { error: 'Service unavailable' },
    };
  }
}
