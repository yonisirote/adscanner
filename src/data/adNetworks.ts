// Known ad network domains and patterns
export const AD_NETWORKS = [
  // Google ads
  'googlesyndication.com',
  'doubleclick.net',
  'google-analytics.com',
  'googleadservices.com',
  'googletagmanager.com',
  
  // Amazon ads
  'amazon-adsystem.com',
  'amazonassociates.com',
  
  // Meta/Facebook ads
  'facebook.com/tr',
  'fbcdn.net',
  'graph.facebook.com',
  
  // Content recommendation
  'taboola.com',
  'outbrain.com',
  
  // Programmatic advertising
  'criteo.com',
  'adroll.com',
  'rubiconproject.com',
  'openx.com',
  'pubmatic.com',
  'appnexus.com',
  'rhythmone.com',
  
  // Display ads
  'adomain.com',
  'serving-sys.com',
  'adtech.de',
  'exponential.com',
  'districtm.io',
  
  // Affiliate/Performance
  'awin.com',
  'cj.dotomi.com',
  'impact.com',
  
  // Additional networks
  'scorecardresearch.com',
  'chartbeat.net',
  'ads.linkedin.com',
  'ads.twitter.com',
  'ads.pinterest.com',
];

export function isAdDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    return AD_NETWORKS.some(network => domain.includes(network.toLowerCase()));
  } catch {
    return false;
  }
}

export function getAdNetworkName(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    return AD_NETWORKS.find(network => domain.includes(network.toLowerCase()));
  } catch {
    return undefined;
  }
}
