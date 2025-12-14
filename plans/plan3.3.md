# Phase 3.3: Visual Indicators on Page

**Goal**: Add visual overlays and badges on the actual webpage to highlight risky ads

---

## Overview

Now that we have:
- ✅ Ad detection and URL extraction (Phase 1)
- ✅ Backend API with risk scoring (Phase 2)
- ✅ Extension-backend integration (Phase 3.1)
- ✅ Popup UI with risk display (Phase 3.2)

We need to add **in-page visual indicators** so users can see which ads are risky without opening the popup.

---

## Design Decisions

### Visual Approach
1. **Badge Overlay**: Small badge in corner of ad element showing risk level
2. **Border Highlight**: Color-coded border around risky ads
3. **Tooltip**: Hover to see detailed risk information
4. **Non-intrusive**: Don't block legitimate content

### Risk Level Colors
- 🟢 **Safe**: No indicator (or subtle green)
- 🟡 **Low**: Yellow badge (optional, don't overwhelm user)
- 🟠 **Medium**: Orange badge + border
- 🔴 **High**: Red badge + border
- ⚠️ **Dangerous**: Red badge + border + warning icon

### UX Principles
- Only show indicators for medium+ risk (reduce noise)
- Smooth fade-in animations
- Click badge to see details
- Respect page layout (absolute positioning)
- Remove indicators when user dismisses them

---

## Tasks

### 1. Create Overlay Component
- **File**: `src/content/adOverlay.ts` (new)
- **Action**: Create functions to inject visual indicators
- **Details**:
  ```typescript
  - createBadge(ad: DetectedAd, element: Element): HTMLElement
  - addBorderHighlight(element: Element, riskLevel: string): void
  - createTooltip(ad: DetectedAd): HTMLElement
  - removeBadge(badgeId: string): void
  - removeAllBadges(): void
  ```
  
### 2. Badge Styling
- **File**: `src/content/adOverlay.ts`
- **Action**: Inject CSS for badges, borders, tooltips
- **Details**:
  - Position: absolute, top-right corner of ad
  - Z-index: high enough to be visible
  - Shadow for visibility on any background
  - Smooth fade-in animation
  - Responsive sizing
  - Font: system font, bold
  
### 3. Track Ad Elements and Badges
- **File**: `src/content/adOverlay.ts`
- **Action**: Maintain Map of ad IDs to badge elements
- **Details**:
  - Store references for cleanup
  - Update badges when risk scores change
  - Handle DOM changes (MutationObserver)
  - Clean up when ads removed from page

### 4. Integrate with Content Script
- **File**: `src/content/content.ts`
- **Action**: Add overlays after ads are checked
- **Details**:
  - After `checkAdsWithBackend()` completes
  - Only show badges for medium+ risk
  - Update overlays when new ads detected
  - Remove overlays when page changes

### 5. Add Tooltip with Details
- **File**: `src/content/adOverlay.ts`
- **Action**: Show detailed info on hover/click
- **Details**:
  - Display: Risk level, score, URL, sources
  - Positioning: near badge, adjust if near edge
  - Dismiss: click outside or close button
  - Animation: smooth fade-in/out

### 6. Settings Support (Optional)
- **File**: `src/content/content.ts`
- **Action**: Respect user preferences
- **Details**:
  - Check if visual indicators enabled
  - Minimum risk level to show (default: medium)
  - Can be implemented in Phase 4

### 7. Performance Optimization
- **Action**: Ensure smooth performance
- **Details**:
  - Use DocumentFragment for batch DOM operations
  - Debounce MutationObserver callbacks
  - RequestAnimationFrame for animations
  - Clean up observers when not needed

---

## Implementation Details

### Badge HTML Structure
```html
<div class="adscanner-badge" data-ad-id="..." data-risk="medium">
  <span class="adscanner-badge-icon">⚠️</span>
  <span class="adscanner-badge-text">Medium Risk</span>
</div>
```

### CSS Classes
- `.adscanner-badge` - Main badge container
- `.adscanner-badge-medium` - Orange styling
- `.adscanner-badge-high` - Red-orange styling
- `.adscanner-badge-dangerous` - Red styling
- `.adscanner-border-highlight` - Border around ad element
- `.adscanner-tooltip` - Tooltip container

### Event Handling
- Click badge → Show detailed tooltip
- Hover badge → Highlight associated ad
- Click dismiss → Remove specific badge
- Esc key → Remove all tooltips

---

## Testing

1. Build extension: `bun run build`
2. Reload extension in Chrome
3. Visit page with ads (e.g., news sites)
4. Click extension → Scan Page
5. Verify:
   - Badges appear on medium+ risk ads
   - Colors match risk levels
   - Hover shows tooltip
   - Badges positioned correctly
   - No layout breaking
   - Smooth animations

---

## Success Criteria

- ✅ Visual badges appear on risky ads
- ✅ Color-coded by risk level
- ✅ Tooltips show detailed information
- ✅ No interference with page functionality
- ✅ Smooth animations and transitions
- ✅ Works across different page layouts
- ✅ Performance remains smooth

---

## Edge Cases to Handle

1. **Dynamic Content**: Ads loaded after initial scan
2. **Overlapping Ads**: Multiple ads in same container
3. **Fixed/Sticky Elements**: Badges on fixed position ads
4. **Small Ads**: Badge might be bigger than ad itself
5. **Page Transitions**: SPA navigation, clean up badges
6. **Multiple Scans**: Don't duplicate badges

