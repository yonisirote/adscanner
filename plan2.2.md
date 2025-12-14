# Phase 2.2: URLVoid API Integration

## Goal
Integrate URLVoid API to check URL reputation and return real risk data.

## Context
- Server scaffold complete (Phase 2.1)
- `/api/check` endpoint exists with mock data
- Types defined: `CheckRequest`, `CheckResponse`, `SourceResult`

## URLVoid API Info
- Docs: https://www.urlvoid.com/api/
- Endpoint: `https://api.urlvoid.com/api1000/{API_KEY}/host/{domain}/`
- Returns: detection counts, engine results, domain info
- Rate limit: varies by plan

## Tasks

### 1. API Client
- [ ] Create `server/src/services/urlvoid.ts`:
  - `checkUrl(domain: string): Promise<UrlVoidResult>`
  - Parse API response into normalized format
  - Handle errors (rate limit, invalid domain, API down)
  - Extract domain from full URL before querying

### 2. Types
- [ ] Add to `server/src/types.ts`:
  ```ts
  interface UrlVoidResult {
    domain: string;
    detectionCount: number;
    enginesCount: number;
    scanDate: string;
    riskScore: number;  // calculated from detection ratio
    details: {
      ip?: string;
      countryCode?: string;
      domainAge?: string;
      engines?: { name: string; detected: boolean }[];
    };
  }
  ```

### 3. Environment Config
- [ ] Create `server/src/config.ts`:
  - Load API keys from env
  - Export typed config object
  - Throw on missing required keys (in production)

### 4. Integrate with Check Route
- [ ] Update `server/src/routes/check.ts`:
  - Call URLVoid service
  - Map result to `SourceResult` format
  - Handle API failures gracefully (return partial results)
  - Keep mock fallback if API key not configured

### 5. Error Handling
- [ ] Create `server/src/services/errors.ts`:
  - `ApiError` class with status code
  - `RateLimitError` extends ApiError
  - `InvalidDomainError` extends ApiError

## Success Criteria
- With valid API key: returns real URLVoid data
- Without API key: falls back to mock data
- Invalid domains return appropriate error
- API failures don't crash the server
