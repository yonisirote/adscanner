export interface Config {
  urlvoidApiKey: string | null;
  scamadvisorApiKey: string | null; // Phase 2.3
  databaseUrl: string | null; // Phase 2.4 (SQLite caching)
  nodeEnv: 'development' | 'production' | 'test';
}

function getEnv(key: string): string | undefined {
  return process.env[key];
}

export function loadConfig(): Config {
  return {
    urlvoidApiKey: getEnv('URLVOID_API_KEY') || null,
    scamadvisorApiKey: getEnv('SCAMADVISOR_API_KEY') || null,
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
