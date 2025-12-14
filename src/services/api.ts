import type { CheckResponse } from '../types';

// Default API URL for development - configurable via chrome.storage.sync
const DEFAULT_API_URL = 'http://localhost:3002';

/**
 * Get the API base URL from storage or use default
 */
async function getApiBaseUrl(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get('apiBaseUrl');
    return result.apiBaseUrl || DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * Check a URL for risk using the backend API
 * 
 * @param url The URL to check for security threats
 * @returns Promise<CheckResponse> Risk analysis results with score and level
 * @throws ApiError on network or API errors
 * 
 * Example:
 * ```
 * const result = await checkUrl('http://example.com');
 * console.log(result.riskScore); // 0-100, higher = riskier
 * console.log(result.riskLevel); // 'safe' | 'low' | 'medium' | 'high' | 'dangerous'
 * ```
 */
export async function checkUrl(url: string): Promise<CheckResponse> {
  try {
    const apiBaseUrl = await getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw {
        message: errorData.error || `API error: ${response.status}`,
        status: response.status,
      } as ApiError;
    }

    const data: CheckResponse = await response.json();
    return data;
  } catch (error) {
    // Network error or fetch failed
    if (error && typeof error === 'object' && 'message' in error) {
      throw error as ApiError;
    }
    throw {
      message: 'Failed to connect to backend API. Is the server running?',
    } as ApiError;
  }
}
