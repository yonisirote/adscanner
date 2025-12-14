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

### Phase 1: Extension Foundation
- [ ] 1.1 Setup extension scaffold (manifest v3, popup, content script)
- [ ] 1.2 Ad detection logic (find ad iframes, links, known ad networks)
- [ ] 1.3 Extract destination URLs from detected ads

### Phase 2: Backend API
- [ ] 2.1 Setup Bun + Hono server
- [ ] 2.2 Integrate urlvoid API
- [ ] 2.3 Integrate scamadvisor API
- [ ] 2.4 Add SQLite caching layer
- [ ] 2.5 Create `/check` endpoint (accepts URL, returns risk score)

### Phase 3: Integration
- [x] 3.1 Extension calls backend API
- [ ] 3.2 Display results in popup (list of ads + scores)
- [ ] 3.3 Visual indicators on page (badge/overlay on suspicious ads)

### Phase 4: Polish
- [ ] 4.1 Rate limiting + error handling
- [ ] 4.2 Settings page (sensitivity, whitelist)
- [ ] 4.3 Deploy backend
- [ ] 4.4 Package extension for Chrome Web Store

---

## Subplan Breakdown
Each phase above will have its own detailed subplan created when we start that phase.
