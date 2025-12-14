# Phase 1.2: Ad Detection Logic

## Goal
Detect ads on the current page by identifying ad iframes, ad-related elements, and known ad network patterns.

## Tasks

### 1. Known Ad Networks List
- [x] Create `src/data/adNetworks.ts` with known ad domains:
  - googlesyndication.com, doubleclick.net
  - amazon-adsystem.com
  - facebook.com/tr, fbcdn.net ads
  - taboola.com, outbrain.com
  - criteo.com, adroll.com
  - Add 20+ common ad networks

### 2. Ad Detection Utilities
- [x] Create `src/content/adDetector.ts` with functions:
  - `findAdIframes()` - iframes with ad network srcs
  - `findAdScripts()` - scripts loading from ad domains
  - `findAdLinks()` - sponsored/affiliate links
  - `findAdsByAttributes()` - elements with ad-related classes/ids (ad, sponsor, promo, etc.)
  - `extractDestinationUrl(element)` - get final URL from ad element

### 3. Ad Data Structure
- [x] Update `src/types.ts` with:
  ```ts
  interface DetectedAd {
    id: string;
    type: 'iframe' | 'script' | 'link' | 'element';
    sourceUrl: string;      // where ad loads from
    destinationUrl?: string; // where ad links to
    element: string;        // selector or outerHTML snippet
    network?: string;       // detected ad network
  }
  ```

### 4. Integrate with Content Script
- [x] Update `src/content/content.ts`:
  - On SCAN message, run all detection functions
  - Dedupe results by URL
  - Return array of DetectedAd objects
  - Log count to console

### 5. Update Popup Display
- [x] Update popup to show detected ads:
  - List each ad with type icon
  - Show destination URL (truncated)
  - Show detected network if known

## Success Criteria
- Scanning google.com or news site finds multiple ads
- Each ad has sourceUrl and type populated
- Popup displays list of found ads
- No errors in console
