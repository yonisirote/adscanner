# Phase 2.4: SQLite Caching Layer

## Goal
Add SQLite caching to avoid redundant API calls and improve response times.

## Context
- URLVoid and Scamadvisor integrations complete (Phase 2.2-2.3)
- Config already has `databaseUrl` placeholder
- `drizzle-orm` already installed
- API calls are expensive (rate limited, slow)

## Tasks

### 1. Database Setup
- [x] Install `better-sqlite3` and `@types/better-sqlite3`
- [x] Create `server/src/db/index.ts`:
   - Initialize SQLite connection
   - Export db instance
   - Handle connection errors gracefully

### 2. Schema Definition
- [x] Create `server/src/db/schema.ts` with Drizzle schema:
  ```ts
  urlChecks table:
    - id: integer primary key
    - domain: text (indexed, unique)
    - urlvoidScore: integer nullable
    - urlvoidData: text (JSON stringified)
    - scamadvisorScore: integer nullable  
    - scamadvisorData: text (JSON stringified)
    - combinedRiskScore: real
    - createdAt: integer (unix timestamp)
    - expiresAt: integer (unix timestamp)
  ```

### 3. Cache Service
- [x] Create `server/src/services/cache.ts`:
   - `getCachedResult(domain: string): Promise<CachedCheck | null>`
   - `setCachedResult(domain: string, result: CachedCheck): Promise<void>`
   - `isExpired(cachedCheck: CachedCheck): boolean`
   - Default TTL: 24 hours (configurable)

### 4. Types
- [x] Add to `server/src/types.ts`:
  ```ts
  interface CachedCheck {
    domain: string;
    urlvoidResult: UrlVoidResult | null;
    scamadvisorResult: ScamadvisorResult | null;
    combinedRiskScore: number;
    cachedAt: string;
    expiresAt: string;
  }
  ```

### 5. Integrate with Check Route
- [x] Update `server/src/routes/check.ts`:
   - Check cache before calling APIs
   - If cache hit and not expired, return cached result with `cached: true`
   - If cache miss or expired, call APIs and store result
   - Handle cache failures gracefully (proceed without cache)

### 6. Database Migration
- [x] Create `server/src/db/migrate.ts` script to create tables
- [x] Add `db:migrate` script to package.json

## File Structure
```
server/src/db/
├── index.ts      # connection
├── schema.ts     # drizzle schema
└── migrate.ts    # migration script
```

## Success Criteria
- First request calls APIs, stores in cache
- Second request (same domain) returns cached result
- `cached: true` in response for cache hits
- Cache expires after 24 hours
- Cache failures don't break the API
