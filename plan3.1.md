# Phase 3.1: Extension Calls Backend API

**Goal**: Connect Chrome extension to backend API for URL risk checking

---

## Tasks

### 1. Add API Response Types
- **File**: `src/types.ts`
- **Action**: Import/define `CheckResponse` type from backend
- **Details**: 
  - Add interface matching backend's response structure
  - Include risk score, level, sources, etc.

### 2. Create API Client Service
- **File**: `src/services/api.ts` (new)
- **Action**: Create `checkUrl(url: string)` function
- **Details**:
  - POST to `http://localhost:3000/api/check`
  - Send `{ url: string }` body
  - Return `CheckResponse`
  - Handle network errors gracefully

### 3. Add Message Types
- **File**: `src/types.ts`
- **Action**: Define message types for chrome.runtime communication
- **Details**:
  - `CheckUrlMessage`: content → background
  - `CheckUrlResponse`: background → content
  - Message action types enum

### 4. Update Background Script
- **File**: `src/background/background.ts`
- **Action**: Add message listener for URL check requests
- **Details**:
  - Listen for `CHECK_URL` messages from content script
  - Call API service with URL
  - Send response back to content script
  - Handle errors and return error state

### 5. Update Content Script
- **File**: `src/content/content.ts`
- **Action**: Send detected ad URLs to background for checking
- **Details**:
  - After detecting ads, send each URL to background
  - Wait for response with risk data
  - Attach risk data to `DetectedAd` objects
  - Log results to console (UI display comes in 3.2)

### 6. Update DetectedAd Type
- **File**: `src/types.ts`
- **Action**: Add optional risk fields to `DetectedAd`
- **Details**:
  - Add `riskScore?: number`
  - Add `riskLevel?: string`
  - Add `isChecking?: boolean`

---

## Testing

1. Start backend: `cd server && bun run dev`
2. Build extension: `cd .. && bun run build`
3. Load unpacked extension in Chrome
4. Navigate to page with ads
5. Check console for detected ads with risk scores

---

## Success Criteria

- ✅ Extension successfully calls backend API
- ✅ Risk scores returned and logged
- ✅ Errors handled gracefully (no crashes)
- ✅ No CORS issues (extension has permission)
