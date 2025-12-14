// Shared types for the extension
export interface Ad {
  id: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface ScanResult {
  adsFound: Ad[];
  timestamp: number;
}

export interface DetectedAd {
  id: string;
  type: 'iframe' | 'script' | 'link' | 'element';
  sourceUrl: string;         // where ad loads from
  destinationUrl?: string;   // where ad links to (after extraction)
  rawDestinationUrl?: string; // original URL before extraction
  extractedUrl?: string;     // URL after unwrapping tracking
  element: string;           // selector or outerHTML snippet
  network?: string;          // detected ad network
  riskScore?: number;        // 0-100 risk score from API
  riskLevel?: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
  isChecking?: boolean;      // true while API call is in progress
}

export interface UserSettings {
  apiBaseUrl: string;
  riskSensitivity: 'low' | 'medium' | 'high'; // low = strict, high = lenient
  whitelistedDomains: string[];
}

// API Response Types (from backend)
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

// Message Types for chrome.runtime communication
export enum MessageAction {
  CHECK_URL = 'CHECK_URL',
  SCAN_PAGE = 'SCAN_PAGE',
  GET_DETECTED_ADS = 'GET_DETECTED_ADS',
  UPDATE_DETECTED_ADS = 'UPDATE_DETECTED_ADS',
}

export interface CheckUrlMessage {
  action: MessageAction.CHECK_URL;
  url: string;
  adId: string;
}

export interface CheckUrlResponse {
  success: boolean;
  adId: string;
  data?: CheckResponse;
  error?: string;
}

export interface GetDetectedAdsMessage {
  action: MessageAction.GET_DETECTED_ADS;
  tabId: number;
}

export interface GetDetectedAdsResponse {
  success: boolean;
  ads: DetectedAd[];
  error?: string;
}
