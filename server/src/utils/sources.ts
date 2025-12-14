import type { SourceResult, UrlVoidResult, ScamadvisorResult } from '../types';

/**
 * Build a source result from URLVoid API response.
 * Returns error details if result is null.
 */
export function buildUrlVoidSource(result: UrlVoidResult | null): SourceResult {
  if (result) {
    return {
      source: 'urlvoid',
      score: result.riskScore,
      details: {
        detectionCount: result.detectionCount,
        enginesCount: result.enginesCount,
        scanDate: result.scanDate,
        ip: result.details.ip,
        engines: result.details.engines?.slice(0, 5),
      },
    };
  } else {
    return {
      source: 'urlvoid',
      score: 0,
      details: { error: 'Service unavailable' },
    };
  }
}

/**
 * Build a source result from Scamadvisor API response.
 * Returns error details if result is null.
 */
export function buildScamadvisorSource(result: ScamadvisorResult | null): SourceResult {
  if (result) {
    return {
      source: 'scamadvisor',
      score: result.riskScore,
      details: {
        trustScore: result.trustScore,
        scanDate: result.scanDate,
        country: result.details.countryCode,
        hasSSL: result.details.hasSSL,
        riskFactors: result.details.riskFactors?.slice(0, 5),
      },
    };
  } else {
    return {
      source: 'scamadvisor',
      score: 0,
      details: { error: 'Service unavailable' },
    };
  }
}
