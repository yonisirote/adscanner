# Phase 2.1: Backend Server Setup

## Goal
Create a Bun + Hono backend server that will serve as a proxy for URL reputation APIs.

## Context (from main plan)
This backend will:
- Receive URLs from the Chrome extension
- Query urlvoid.com, scamadvisor.com APIs
- Cache results in SQLite
- Return risk scores to extension

## Tasks

### 1. Project Structure
- [x] Create `server/` directory in workspace root
- [x] Initialize with `bun init`
- [x] Install dependencies: `hono`, `drizzle-orm`, `better-sqlite3`
- [x] Setup TypeScript config

### 2. Hono Server Setup
- [x] Create `server/src/index.ts` - main entry point
- [x] Configure CORS for extension requests
- [x] Add health check endpoint: `GET /health`
- [x] Add placeholder endpoint: `POST /api/check` (accepts URL, returns mock score)
- [x] Error handling middleware

### 3. Project Configuration
- [x] `server/package.json` with scripts:
   - [x] `dev` - run with hot reload
   - [x] `build` - bundle for production
   - [x] `start` - run production build
- [x] `server/tsconfig.json` with strict mode
- [x] `server/.env.example` for API keys (to be added later)

### 4. Types & Validation
- [x] Create `server/src/types.ts`:
   ```ts
   interface CheckRequest {
     url: string;
   }
   interface CheckResponse {
     url: string;
     riskScore: number;      // 0-100
     riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous';
     sources: SourceResult[];
     cached: boolean;
     checkedAt: string;
   }
   interface SourceResult {
     source: string;
     score: number;
     details?: Record<string, unknown>;
   }
   ```
- [x] Add input validation for `/api/check`

### 5. Folder Structure
```
server/
├── src/
│   ├── index.ts          # entry point
│   ├── routes/
│   │   └── check.ts      # /api/check route
│   ├── types.ts          # shared types
│   └── middleware/
│       └── cors.ts       # CORS config
├── package.json
├── tsconfig.json
└── .env.example
```

## Success Criteria
- [x] `bun run dev` starts server on port 3000
- [x] `GET /health` returns `{ status: "ok" }`
- [x] `POST /api/check` with `{ url: "https://example.com" }` returns mock CheckResponse
- [x] CORS allows requests from Chrome extension
- [x] No TypeScript errors
