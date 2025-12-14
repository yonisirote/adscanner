# Phase 2.3: Scamadvisor API Integration

## Goal
Integrate Scamadvisor API to provide a second reputation source for URL checking.

## Context
- URLVoid integration complete (Phase 2.2)
- Error handling patterns established (`ApiError`, `RateLimitError`, etc.)
- Config already has `scamadvisorApiKey` placeholder
- Check route has placeholder for scamadvisor source

## Scamadvisor API Info
- Docs: https://www.scamadviser.com/api
- Endpoint: `https://api.scamadviser.com/v2/trust/single`
- Auth: API key in header or query param
- Returns: trust score (0-100), domain info, risk factors

## Tasks

### 1. API Client
- [x] Create `server/src/services/scamadvisor.ts`:
   - [x] `checkUrl(domain: string): Promise<ScamadvisorResult>`
   - [x] Parse API response into normalized format
   - [x] Handle errors (rate limit, invalid domain, API down)
   - [x] Extract domain from full URL before querying
   - [x] Mock fallback if no API key (same pattern as URLVoid)

### 2. Types
- [x] Add to `server/src/types.ts`:
   ```ts
   interface ScamadvisorResult {
     domain: string;
     trustScore: number;        // 0-100 (higher = safer)
     riskScore: number;         // inverted: 100 - trustScore
     scanDate: string;
     details: {
       countryCode?: string;
       isPopular?: boolean;
       hasSSL?: boolean;
       domainAge?: string;
       riskFactors?: string[];
     };
   }
   ```

### 3. Integrate with Check Route
- [x] Update `server/src/routes/check.ts`:
   - [x] Import and call scamadvisor service
   - [x] Run URLVoid and Scamadvisor in parallel (`Promise.all`)
   - [x] Map scamadvisor result to `SourceResult` format
   - [x] Calculate combined `riskScore` as average of both sources
   - [x] Handle partial failures (one API fails, other succeeds)

### 4. Update Error Types (if needed)
- [x] Reuse existing `ApiError` subclasses
- [x] Add any scamadvisor-specific errors if API has unique failure modes (none needed)

## Success Criteria
- With valid API key: returns real Scamadvisor data alongside URLVoid
- Without API key: falls back to mock data for both
- One source failing doesn't break the other
- Combined risk score reflects both sources
- No TypeScript errors
