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

export interface VirusTotalResult {
  domain: string;
  detectionCount: number;
  enginesCount: number;
  scanDate: string;
  riskScore: number;
  details: {
    categories?: string[];
    reputation?: number;
    lastAnalysisDate?: string;
    engines?: { name: string; detected: boolean }[];
  };
}

export interface GoogleSafeBrowsingResult {
  domain: string;
  threatTypes: string[];
  riskScore: number;
  scanDate: string;
  details: {
    platformTypes?: string[];
    threatEntryTypes?: string[];
    isSafe: boolean;
  };
}

export interface CachedCheck {
  domain: string;
  virusTotalResult: VirusTotalResult | null;
  googleSafeBrowsingResult: GoogleSafeBrowsingResult | null;
  combinedRiskScore: number;
  cachedAt: string;
  expiresAt: string;
}
