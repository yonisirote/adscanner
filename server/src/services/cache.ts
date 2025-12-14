import { getDb, saveDb } from '../db/index';
import type { CachedCheck, ScamadvisorResult, UrlVoidResult } from '../types';
import { extractDomain } from '../utils/url';

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function getCachedResult(url: string): Promise<CachedCheck | null> {
  try {
    const domain = extractDomain(url);
    const db = await getDb();
    
    const results = db.exec(
      'SELECT * FROM url_checks WHERE domain = ?',
      [domain]
    );

    if (!results || results.length === 0 || !results[0].values || results[0].values.length === 0) {
      return null;
    }

    const row = results[0].values[0];
    // Map columns by index
    const cached = {
      id: row[0],
      domain: row[1],
      urlvoidScore: row[2],
      urlvoidData: row[3],
      scamadvisorScore: row[4],
      scamadvisorData: row[5],
      combinedRiskScore: row[6],
      createdAt: row[7],
      expiresAt: row[8],
    };
    
    // Check if expired
    if (isExpired(cached)) {
      return null;
    }

    const cachedCheck: CachedCheck = {
      domain: cached.domain,
      urlvoidResult: cached.urlvoidData ? JSON.parse(cached.urlvoidData) : null,
      scamadvisorResult: cached.scamadvisorData ? JSON.parse(cached.scamadvisorData) : null,
      combinedRiskScore: cached.combinedRiskScore,
      cachedAt: new Date(cached.createdAt).toISOString(),
      expiresAt: new Date(cached.expiresAt).toISOString(),
    };

    return cachedCheck;
  } catch (error) {
    console.error('Cache retrieval error:', error);
    return null;
  }
}

export async function setCachedResult(
  url: string,
  urlvoidResult: UrlVoidResult | null,
  scamadvisorResult: ScamadvisorResult | null,
  combinedRiskScore: number
): Promise<void> {
  try {
    const domain = extractDomain(url);
    const db = await getDb();
    const now = Date.now();
    const expiresAt = now + DEFAULT_TTL;

    // Delete existing entry if it exists
    db.run('DELETE FROM url_checks WHERE domain = ?', [domain]);

    // Insert new entry
    db.run(
      `INSERT INTO url_checks (domain, urlvoid_score, urlvoid_data, scamadvisor_score, scamadvisor_data, combined_risk_score, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        domain,
        urlvoidResult?.riskScore ?? null,
        urlvoidResult ? JSON.stringify(urlvoidResult) : null,
        scamadvisorResult?.riskScore ?? null,
        scamadvisorResult ? JSON.stringify(scamadvisorResult) : null,
        combinedRiskScore,
        now,
        expiresAt,
      ]
    );

    // Save database to file
    saveDb();
  } catch (error) {
    console.error('Cache storage error:', error);
    // Silently fail - don't throw
  }
}

function isExpired(cachedCheck: any): boolean {
  const now = Date.now();
  return now > cachedCheck.expiresAt;
}
