# Phase 2.5: Finalize /api/check Endpoint

## Goal
Polish the check endpoint, reduce code duplication, add final touches for production readiness.

## Context
- All API integrations complete (URLVoid, Scamadvisor)
- Caching layer complete
- Partial failure handling works
- Code has some duplication from iterative development

## Tasks

### 1. Refactor Source Building
- [x] Extract source-building logic into helper functions:
  - `buildUrlVoidSource(result: UrlVoidResult | null): SourceResult`
  - `buildScamadvisorSource(result: ScamadvisorResult | null): SourceResult`
- [x] Use helpers in both cached and fresh code paths
- [x] Remove duplicated source-building code

### 2. Extract Domain Helper
- [x] Create shared `server/src/utils/url.ts`:
  - `extractDomain(url: string): string`
  - Remove duplicate implementations from urlvoid.ts, scamadvisor.ts, cache.ts

### 3. Fix Type Issues
- [x] Remove `as any` casts in check.ts error handling (except necessary Hono StatusCode)
- [x] Use proper Hono response types

### 4. Update Docstring
- [x] Update check.ts docstring to reflect both sources and caching

### 5. Add Request Logging
- [x] Log incoming requests (URL, cache hit/miss)
- [x] Log response time
- [x] Keep logs concise (one line per request)

### 6. Add Rate Limiting (basic)
- [x] Simple in-memory rate limiter
- [x] Limit: 60 requests per minute per IP
- [x] Return 429 when exceeded

### 7. Environment Validation
- [x] Warn on startup if no API keys configured
- [x] Log which services are in mock mode

## Success Criteria
- Code is DRY (no duplicated source-building)
- No TypeScript `any` casts
- Request logs show cache hit/miss and timing
- Rate limiting prevents abuse
- Startup shows configuration status
