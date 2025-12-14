import type { GoogleSafeBrowsingResult } from '../types';
import { RateLimitError } from './errors';
import { getConfig } from '../config';
import { extractDomain } from '../utils/url';

interface SafeBrowsingApiResponse {
  matches?: Array<{
    threatType: string;
    platformType: string;
    threat: { url: string };
    cacheDuration: string;
    threatEntryType: string;
  }>;
}

function invertTrustToRiskScore(trustScore: number): number {
  return 100 - trustScore;
}

/**
 * Query Google Safe Browsing API v4 for URL reputation.
 * Returns normalized result with inverted risk score (0-100, higher = riskier).
 * Falls back to mock data if API key missing or request fails.
 * 
 * @param urlString The URL to check for threats
 * @returns Promise<GoogleSafeBrowsingResult> Risk analysis from Google Safe Browsing
 * @throws RateLimitError if API rate limit exceeded
 * 
 * Free tier: 10,000 requests/day
 * API Docs: https://developers.google.com/safe-browsing/v4/lookup-api
 */
export async function checkUrl(urlString: string): Promise<GoogleSafeBrowsingResult> {
  const config = getConfig();

  const domain = extractDomain(urlString);

  if (!config.googleSafeBrowsingApiKey) {
    return getMockResult(domain);
  }

  try {
    const apiUrl = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${config.googleSafeBrowsingApiKey}`;

    const requestBody = {
      client: {
        clientId: 'adscanner',
        clientVersion: '1.0.0',
      },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url: urlString }],
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      console.warn(`[Safe Browsing] Rate limit exceeded for ${domain}`);
      throw new RateLimitError('Google Safe Browsing API rate limit exceeded');
    }

    if (!response.ok) {
      throw new Error(`Safe Browsing API error: ${response.statusText}`);
    }

    const data = (await response.json()) as SafeBrowsingApiResponse;

    // If matches array exists and has entries, URL is flagged as dangerous
    const matches = data.matches || [];
    const threatCount = matches.length;

    let trustScore: number;
    let riskFactors: string[] = [];

    if (threatCount === 0) {
      // No threats found - high trust
      trustScore = 90;
    } else {
      // Threats found - low trust based on severity
      const threatTypes = matches.map(m => m.threatType);
      riskFactors = threatTypes;
      
      if (threatTypes.includes('MALWARE')) {
        trustScore = 10; // Very dangerous
      } else if (threatTypes.includes('SOCIAL_ENGINEERING')) {
        trustScore = 20; // Phishing
      } else if (threatTypes.includes('UNWANTED_SOFTWARE')) {
        trustScore = 30; // PUP
      } else {
        trustScore = 40; // Other threats
      }
    }

    const riskScore = invertTrustToRiskScore(trustScore);

    console.log(`[Safe Browsing] ${domain} -> ${threatCount} threats, trust: ${trustScore}, risk: ${riskScore.toFixed(1)}`);

    return {
      domain,
      threatTypes: riskFactors,
      riskScore,
      scanDate: new Date().toISOString(),
      details: {
        isSafe: threatCount === 0,
        platformTypes: matches.length > 0 ? matches.map(m => m.platformType) : undefined,
        threatEntryTypes: matches.length > 0 ? matches.map(m => m.threatEntryType) : undefined,
      },
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Safe Browsing] API timeout');
      return getMockResult(domain);
    }

    console.error('[Safe Browsing] API error:', error);
    return getMockResult(domain);
  }
}

/**
 * Fallback mock result for dev (no API key) or API failures.
 * Uses domain-based logic for consistent testing.
 */
function getMockResult(domain: string): GoogleSafeBrowsingResult {
  // Create deterministic results based on domain
  const domainHash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // High risk domains (for testing)
  const highRiskKeywords = ['ads', 'doubleclick', 'adserver', 'adnetwork', 'click', 'tracking', 'dangerous', 'risky'];
  const isHighRisk = highRiskKeywords.some(keyword => domain.includes(keyword));
  
  let trustScore: number;
  let riskFactors: string[] | undefined;
  
  if (isHighRisk) {
    // High risk: low trust (10-30)
    trustScore = 10 + (domainHash % 20);
    riskFactors = ['UNWANTED_SOFTWARE', 'SUSPICIOUS'];
  } else if (domain.includes('example') || domain.includes('test') || domain.includes('medium')) {
    // Medium risk: medium trust (40-60)
    trustScore = 40 + (domainHash % 20);
    riskFactors = undefined;
  } else {
    // Low risk: high trust (70-95)
    trustScore = 70 + (domainHash % 25);
    riskFactors = undefined;
  }
  
  const riskScore = invertTrustToRiskScore(trustScore);

  console.log(`[Safe Browsing Mock] ${domain} -> trust: ${trustScore}, risk: ${riskScore.toFixed(1)}`);

  return {
    domain,
    threatTypes: riskFactors || [],
    riskScore,
    scanDate: new Date().toISOString(),
    details: {
      isSafe: !isHighRisk,
      platformTypes: undefined,
      threatEntryTypes: undefined,
    },
  };
}
