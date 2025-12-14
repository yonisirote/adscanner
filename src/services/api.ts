import { getSettings } from './storage';
import type { CheckResponse } from '../types';

// Default API URL (fallback)
const DEFAULT_API_URL = 'http://localhost:3002';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Error types for better UI handling
 */
export type ApiErrorType =
  | 'network'      // Server unreachable
  | 'timeout'      // Request timed out
  | 'rate_limit'   // 429 rate limited
  | 'server_error' // 5xx errors
  | 'client_error' // 4xx errors
  | 'unknown';

export interface ApiError {
  message: string;
  type: ApiErrorType;
  status?: number;
  retryAfter?: number; // Seconds to wait for rate limit
  retryable: boolean;
}

/**
 * Get the API base URL from storage
 */
async function getApiBaseUrl(): Promise<string> {
  const settings = await getSettings();
  return settings.apiBaseUrl || DEFAULT_API_URL;
}

/**
 * Delay helper for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if navigator is online (basic offline detection)
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Create an ApiError from various error conditions
 */
function createApiError(
  message: string,
  type: ApiErrorType,
  options: { status?: number; retryAfter?: number } = {}
): ApiError {
  const retryable = type === 'network' || type === 'timeout' || type === 'server_error';
  return {
    message,
    type,
    status: options.status,
    retryAfter: options.retryAfter,
    retryable,
  };
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  // Check offline first
  if (!isOnline()) {
    throw createApiError(
      'You appear to be offline. Please check your internet connection.',
      'network'
    );
  }

  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Success - return response
      if (response.ok) {
        return response;
      }

      // Rate limit - extract retry-after and throw
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        throw createApiError(
          `Rate limit exceeded. Please wait ${retryAfter} seconds.`,
          'rate_limit',
          { status: 429, retryAfter }
        );
      }

      // Client errors (4xx except 429) - don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw createApiError(
          errorData.error || `Request failed (${response.status})`,
          'client_error',
          { status: response.status }
        );
      }

      // Server errors (5xx) - retry
      if (response.status >= 500) {
        lastError = createApiError(
          `Server error (${response.status}). Retrying...`,
          'server_error',
          { status: response.status }
        );
        // Fall through to retry logic
      }
    } catch (error) {
      // Already an ApiError - check if retryable
      if (error && typeof error === 'object' && 'type' in error) {
        const apiError = error as ApiError;
        if (!apiError.retryable || attempt === retries) {
          throw apiError;
        }
        lastError = apiError;
      } else if (error instanceof Error) {
        // Handle abort (timeout)
        if (error.name === 'AbortError') {
          lastError = createApiError(
            'Request timed out. The server may be slow or unresponsive.',
            'timeout'
          );
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          // Network error
          lastError = createApiError(
            'Unable to connect to the server. Please ensure the backend is running.',
            'network'
          );
        } else {
          lastError = createApiError(
            error.message,
            'unknown'
          );
        }
      } else {
        lastError = createApiError('An unknown error occurred', 'unknown');
      }
    }

    // Don't wait after the last attempt
    if (attempt < retries && lastError?.retryable) {
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      console.log(`[API] Retry ${attempt + 1}/${retries} after ${delayMs}ms...`);
      await delay(delayMs);
    }
  }

  // All retries exhausted
  throw lastError || createApiError('Failed after multiple retries', 'unknown');
}

/**
 * Check a URL for risk using the backend API
 * 
 * @param url The URL to check for security threats
 * @returns Promise<CheckResponse> Risk analysis results with score and level
 * @throws ApiError on network or API errors with user-friendly messages
 * 
 * Example:
 * ```
 * const result = await checkUrl('http://example.com');
 * console.log(result.riskScore); // 0-100, higher = riskier
 * console.log(result.riskLevel); // 'safe' | 'low' | 'medium' | 'high' | 'dangerous'
 * ```
 */
export async function checkUrl(url: string): Promise<CheckResponse> {
  const apiBaseUrl = await getApiBaseUrl();

  try {
    const response = await fetchWithRetry(`${apiBaseUrl}/api/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data: CheckResponse = await response.json();
    return data;
  } catch (error) {
    // Re-throw ApiErrors as-is
    if (error && typeof error === 'object' && 'type' in error) {
      throw error;
    }

    // Wrap unexpected errors
    throw createApiError(
      'Failed to check URL. Please try again.',
      'unknown'
    );
  }
}
