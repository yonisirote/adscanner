export interface CheckRequest {
  url: string;
}

export interface SourceResult {
  source: string;
  score: number;
  details?: Record<string, unknown>;
}

export interface CheckResponse {
  url: string;
  riskScore: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
  sources: SourceResult[];
  cached: boolean;
  checkedAt: string;
}

export interface HealthResponse {
  status: 'ok';
}

export interface UrlVoidResult {
  domain: string;
  detectionCount: number;
  enginesCount: number;
  scanDate: string;
  riskScore: number;
  details: {
    ip?: string;
    countryCode?: string;
    domainAge?: string;
    engines?: { name: string; detected: boolean }[];
  };
}

export interface ScamadvisorResult {
  domain: string;
  trustScore: number;
  riskScore: number;
  scanDate: string;
  details: {
    countryCode?: string;
    isPopular?: boolean;
    hasSSL?: boolean;
    domainAge?: string;
    riskFactors?: string[];
  };
}

export interface CachedCheck {
  domain: string;
  urlvoidResult: UrlVoidResult | null;
  scamadvisorResult: ScamadvisorResult | null;
  combinedRiskScore: number;
  cachedAt: string;
  expiresAt: string;
}
