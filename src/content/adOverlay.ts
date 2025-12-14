import type { DetectedAd } from '../types';

// Track created badges and tooltips for cleanup
const badgeElements = new Map<string, HTMLElement>();
const tooltipElements = new Map<string, HTMLElement>();
let stylesInjected = false;

/**
 * Inject CSS styles for badges and tooltips
 */
export function injectStyles(): void {
  if (stylesInjected) return;

  const style = document.createElement('style');
  style.id = 'adscanner-styles';
  style.textContent = `
    /* Badge Container */
    .adscanner-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
      z-index: 999999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s, box-shadow 0.2s;
      animation: adscanner-fade-in 0.3s ease-out;
      user-select: none;
    }

    .adscanner-badge:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    /* Risk Level Colors */
    .adscanner-badge-medium {
      background: linear-gradient(135deg, #FF9800 0%, #FB8C00 100%);
      color: white;
    }

    .adscanner-badge-high {
      background: linear-gradient(135deg, #FF5722 0%, #F4511E 100%);
      color: white;
    }

    .adscanner-badge-dangerous {
      background: linear-gradient(135deg, #F44336 0%, #E53935 100%);
      color: white;
      animation: adscanner-pulse 2s ease-in-out infinite;
    }

    /* Badge Text */
    .adscanner-badge-icon {
      font-size: 13px;
      line-height: 1;
    }

    .adscanner-badge-text {
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Border Highlight */
    .adscanner-border-highlight {
      outline: 3px solid transparent;
      outline-offset: 2px;
      transition: outline-color 0.3s;
      position: relative;
    }

    .adscanner-border-highlight.adscanner-risk-medium {
      outline-color: #FF9800;
    }

    .adscanner-border-highlight.adscanner-risk-high {
      outline-color: #FF5722;
    }

    .adscanner-border-highlight.adscanner-risk-dangerous {
      outline-color: #F44336;
      animation: adscanner-border-pulse 2s ease-in-out infinite;
    }

    /* Tooltip */
    .adscanner-tooltip {
      position: fixed;
      background: white;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      z-index: 1000000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      animation: adscanner-fade-in 0.2s ease-out;
    }

    .adscanner-tooltip-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .adscanner-tooltip-title {
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .adscanner-tooltip-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .adscanner-tooltip-close:hover {
      background-color: #f5f5f5;
      color: #333;
    }

    .adscanner-tooltip-content {
      color: #666;
    }

    .adscanner-tooltip-row {
      margin: 6px 0;
    }

    .adscanner-tooltip-label {
      font-weight: 600;
      color: #333;
      margin-right: 4px;
    }

    .adscanner-tooltip-value {
      word-break: break-all;
    }

    .adscanner-tooltip-url {
      font-size: 11px;
      color: #999;
      max-height: 60px;
      overflow-y: auto;
      padding: 4px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-top: 4px;
    }

    /* Animations */
    @keyframes adscanner-fade-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes adscanner-pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
    }

    @keyframes adscanner-border-pulse {
      0%, 100% {
        outline-width: 3px;
      }
      50% {
        outline-width: 4px;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .adscanner-badge {
        font-size: 10px;
        padding: 3px 6px;
      }

      .adscanner-tooltip {
        max-width: 250px;
        font-size: 12px;
      }
    }
  `;

  document.head.appendChild(style);
  stylesInjected = true;
  console.log('[AdOverlay] Styles injected');
}

/**
 * Get risk icon for badge
 */
function getRiskIcon(riskLevel: string): string {
  switch (riskLevel) {
    case 'medium':
      return '⚠️';
    case 'high':
      return '🔴';
    case 'dangerous':
      return '⛔';
    default:
      return '⚠️';
  }
}

/**
 * Get risk label for display
 */
function getRiskLabel(riskLevel: string): string {
  switch (riskLevel) {
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
    case 'dangerous':
      return 'Dangerous';
    default:
      return 'Risk';
  }
}

/**
 * Create a badge element for an ad
 */
export function createBadge(ad: DetectedAd, element: Element): HTMLElement | null {
  if (!ad.riskLevel || ad.riskLevel === 'safe' || ad.riskLevel === 'low') {
    return null; // Only show badges for medium+ risk
  }

  // Check if badge already exists
  if (badgeElements.has(ad.id)) {
    return badgeElements.get(ad.id)!;
  }

  const badge = document.createElement('div');
  badge.className = `adscanner-badge adscanner-badge-${ad.riskLevel}`;
  badge.setAttribute('data-ad-id', ad.id);
  badge.setAttribute('data-risk', ad.riskLevel);

  const icon = document.createElement('span');
  icon.className = 'adscanner-badge-icon';
  icon.textContent = getRiskIcon(ad.riskLevel);

  const text = document.createElement('span');
  text.className = 'adscanner-badge-text';
  text.textContent = getRiskLabel(ad.riskLevel);

  badge.appendChild(icon);
  badge.appendChild(text);

  // Click to show tooltip
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggleTooltip(ad, badge);
  });

  badgeElements.set(ad.id, badge);
  console.log(`[AdOverlay] Created badge for ad ${ad.id} (${ad.riskLevel})`);

  return badge;
}

/**
 * Add border highlight to an element
 */
export function addBorderHighlight(element: Element, riskLevel: string): void {
  if (riskLevel === 'safe' || riskLevel === 'low') {
    return; // Only highlight medium+ risk
  }

  element.classList.add('adscanner-border-highlight', `adscanner-risk-${riskLevel}`);
}

/**
 * Remove border highlight from an element
 */
export function removeBorderHighlight(element: Element): void {
  element.classList.remove(
    'adscanner-border-highlight',
    'adscanner-risk-medium',
    'adscanner-risk-high',
    'adscanner-risk-dangerous'
  );
}

/**
 * Create tooltip with ad details
 */
function createTooltip(ad: DetectedAd): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'adscanner-tooltip';
  tooltip.setAttribute('data-ad-id', ad.id);

  const header = document.createElement('div');
  header.className = 'adscanner-tooltip-header';

  const title = document.createElement('div');
  title.className = 'adscanner-tooltip-title';
  title.innerHTML = `
    <span>${getRiskIcon(ad.riskLevel || 'medium')}</span>
    <span>${getRiskLabel(ad.riskLevel || 'medium')}</span>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'adscanner-tooltip-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => removeTooltip(ad.id);

  header.appendChild(title);
  header.appendChild(closeBtn);

  const content = document.createElement('div');
  content.className = 'adscanner-tooltip-content';

  const rows: string[] = [];

  if (ad.riskScore !== undefined) {
    rows.push(`
      <div class="adscanner-tooltip-row">
        <span class="adscanner-tooltip-label">Risk Score:</span>
        <span class="adscanner-tooltip-value">${ad.riskScore}/100</span>
      </div>
    `);
  }

  if (ad.network) {
    rows.push(`
      <div class="adscanner-tooltip-row">
        <span class="adscanner-tooltip-label">Network:</span>
        <span class="adscanner-tooltip-value">${ad.network}</span>
      </div>
    `);
  }

  rows.push(`
    <div class="adscanner-tooltip-row">
      <span class="adscanner-tooltip-label">Type:</span>
      <span class="adscanner-tooltip-value">${ad.type}</span>
    </div>
  `);

  const displayUrl = ad.extractedUrl || ad.destinationUrl || ad.sourceUrl;
  rows.push(`
    <div class="adscanner-tooltip-row">
      <span class="adscanner-tooltip-label">URL:</span>
      <div class="adscanner-tooltip-url">${displayUrl}</div>
    </div>
  `);

  content.innerHTML = rows.join('');

  tooltip.appendChild(header);
  tooltip.appendChild(content);

  return tooltip;
}

/**
 * Toggle tooltip visibility
 */
function toggleTooltip(ad: DetectedAd, badgeElement: HTMLElement): void {
  const existingTooltip = tooltipElements.get(ad.id);

  if (existingTooltip) {
    removeTooltip(ad.id);
    return;
  }

  // Remove other tooltips first
  removeAllTooltips();

  const tooltip = createTooltip(ad);
  document.body.appendChild(tooltip);
  tooltipElements.set(ad.id, tooltip);

  // Position tooltip near badge
  positionTooltip(tooltip, badgeElement);

  console.log(`[AdOverlay] Showing tooltip for ad ${ad.id}`);
}

/**
 * Position tooltip relative to badge
 */
function positionTooltip(tooltip: HTMLElement, badgeElement: HTMLElement): void {
  const badgeRect = badgeElement.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  let top = badgeRect.bottom + 8;
  let left = badgeRect.right - tooltipRect.width;

  // Adjust if tooltip goes off-screen
  if (left < 10) {
    left = 10;
  }

  if (top + tooltipRect.height > window.innerHeight - 10) {
    top = badgeRect.top - tooltipRect.height - 8;
  }

  if (top < 10) {
    top = 10;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

/**
 * Remove specific tooltip
 */
function removeTooltip(adId: string): void {
  const tooltip = tooltipElements.get(adId);
  if (tooltip) {
    tooltip.remove();
    tooltipElements.delete(adId);
    console.log(`[AdOverlay] Removed tooltip for ad ${adId}`);
  }
}

/**
 * Remove all tooltips
 */
function removeAllTooltips(): void {
  tooltipElements.forEach((tooltip) => tooltip.remove());
  tooltipElements.clear();
}

/**
 * Remove specific badge
 */
export function removeBadge(adId: string): void {
  const badge = badgeElements.get(adId);
  if (badge) {
    badge.remove();
    badgeElements.delete(adId);
  }
  removeTooltip(adId);
}

/**
 * Remove all badges and tooltips
 */
export function removeAllBadges(): void {
  badgeElements.forEach((badge) => badge.remove());
  badgeElements.clear();
  removeAllTooltips();
  console.log('[AdOverlay] Removed all badges and tooltips');
}

/**
 * Add overlay to a detected ad
 */
export function addOverlay(ad: DetectedAd, element: Element): void {
  if (!ad.riskLevel || ad.riskLevel === 'safe' || ad.riskLevel === 'low') {
    return; // Only show overlays for medium+ risk
  }

  // Ensure element has position context for absolute positioning
  const computedStyle = window.getComputedStyle(element);
  if (computedStyle.position === 'static') {
    (element as HTMLElement).style.position = 'relative';
  }

  // Add border highlight
  addBorderHighlight(element, ad.riskLevel);

  // Create and append badge
  const badge = createBadge(ad, element);
  if (badge) {
    element.appendChild(badge);
  }
}

/**
 * Update overlay when ad data changes
 */
export function updateOverlay(ad: DetectedAd, element: Element): void {
  // Remove old overlay
  const oldBadge = badgeElements.get(ad.id);
  if (oldBadge) {
    oldBadge.remove();
    badgeElements.delete(ad.id);
  }

  // Add new overlay with updated data
  addOverlay(ad, element);
}

// Close tooltips when clicking outside
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.adscanner-tooltip') && !target.closest('.adscanner-badge')) {
    removeAllTooltips();
  }
});

// Close tooltips on Esc key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    removeAllTooltips();
  }
});
