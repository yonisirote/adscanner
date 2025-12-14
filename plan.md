# Ad Legitimacy Checker - Chrome Extension


### Plan: Backend Proxy
Extension → Backend Server → External APIs
- ✅ Secure API keys, caching, rate limit handling
- ✅ Aggregate multiple sources
- ❌ Requires hosting


---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Extension | TypeScript + Manifest V3 | Type safety, modern Chrome APIs |
| Backend | Bun + Hono | Fast, simple, great DX |
| Database | SQLite (via Drizzle) | Cache results, zero infra |
| Hosting | Fly.io or Railway | Cheap, easy deploy |

---

## High-Level Plan

### Phase 1: Extension Foundation ✅
- [x] 1.1 Setup extension scaffold (manifest v3, popup, content script)
- [x] 1.2 Ad detection logic (find ad iframes, links, known ad networks)
- [x] 1.3 Extract destination URLs from detected ads

### Phase 2: Backend API ✅
- [x] 2.1 Setup Bun + Hono server
- [x] 2.2 Integrate VirusTotal API (replaced URLVoid - Dec 2025)
- [x] 2.3 Integrate Google Safe Browsing API (replaced ScamAdvisor - Dec 2025)
- [x] 2.4 Add SQLite caching layer
- [x] 2.5 Create `/check` endpoint (accepts URL, returns risk score)

### Phase 3: Integration ✅
- [x] 3.1 Extension calls backend API
- [x] 3.2 Display results in popup (list of ads + scores)
- [x] 3.3 Visual indicators on page (badge/overlay on suspicious ads)

### Phase 4: Polish
- [x] 4.1 API Migration (VirusTotal + Google Safe Browsing)
- [ ] 4.2 Rate limiting + error handling
- [ ] 4.3 Settings page (sensitivity, whitelist)
- [ ] 4.4 Deploy backend
- [ ] 4.5 Package extension for Chrome Web Store

---

## Subplan Breakdown
Each phase above will have its own detailed subplan created when we start that phase.
