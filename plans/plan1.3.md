# Phase 1.3: Extract Destination URLs

## Goal
Extract the actual destination URLs from detected ads, handling redirects, tracking URLs, and encoded parameters.

## Tasks

### 1. URL Extraction Utilities
- [x] Create `src/content/urlExtractor.ts` with:
  - `extractFinalUrl(element)` - get clickable destination from any ad element
  - `parseTrackingUrl(url)` - extract real URL from tracking wrappers (Google, Facebook, etc.)
  - `decodeUrlParam(url, param)` - decode URL parameters like `url=`, `dest=`, `redirect=`
  - `resolveRelativeUrl(url, base)` - handle relative URLs

### 2. Common Tracking Patterns
- [x] Handle Google tracking: `google.com/aclk?...&adurl=`
- [x] Handle Facebook tracking: `l.facebook.com/l.php?u=`
- [x] Handle generic patterns: `?url=`, `?dest=`, `?redirect=`, `?target=`
- [x] Handle base64 encoded URLs
- [x] Handle double-encoded URLs

### 3. Integrate with Ad Detector
- [x] Update `adDetector.ts`:
  - Call URL extractor for each detected ad
  - Populate `destinationUrl` field with extracted URL
  - Keep `sourceUrl` as the original ad source

### 4. Update Types
- [x] Add to `DetectedAd` in types.ts:
  ```ts
  rawDestinationUrl?: string;  // before extraction
  extractedUrl?: string;       // after unwrapping tracking
  ```

### 5. Popup Enhancements
- [x] Show extracted URL if different from source
- [x] Visual indicator when URL was unwrapped from tracking
- [x] Tooltip with full URL on hover

## Success Criteria
- Google ad links show actual destination, not google.com/aclk
- Facebook tracked links show real destination
- URLs are properly decoded (no %20, %3A, etc. in display)
