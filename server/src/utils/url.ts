import { InvalidDomainError } from '../services/errors';

/**
 * Extract domain (hostname) from a URL string.
 * Throws InvalidDomainError if the URL is invalid.
 */
export function extractDomain(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    throw new InvalidDomainError(urlString);
  }
}
