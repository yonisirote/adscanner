import type { CheckResponse } from '../types';

const API_BASE_URL = 'http://localhost:3002';

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * Check a URL for risk using the backend API
 * @param url The URL to check
 * @returns Promise<CheckResponse> Risk analysis results
 * @throws ApiError on network or API errors
 */
export async function checkUrl(url: string): Promise<CheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/check`, {
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
