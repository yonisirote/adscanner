export interface Config {
  virusTotalApiKey: string | null;
  googleSafeBrowsingApiKey: string | null;
  databaseUrl: string | null; // Phase 2.4 (SQLite caching)
  nodeEnv: 'development' | 'production' | 'test';
}

function getEnv(key: string): string | undefined {
  return process.env[key];
}

export function loadConfig(): Config {
  return {
    virusTotalApiKey: getEnv('VIRUSTOTAL_API_KEY') || null,
    googleSafeBrowsingApiKey: getEnv('GOOGLE_SAFE_BROWSING_API_KEY') || null,
    databaseUrl: getEnv('DATABASE_URL') || null,
    nodeEnv: (getEnv('NODE_ENV') as Config['nodeEnv']) || 'development',
  };
}

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = loadConfig();
  }
  return config;
}
