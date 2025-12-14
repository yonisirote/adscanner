import type { Context, Next } from 'hono';

function getAllowedOrigins(): string[] {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const customOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [];

  if (nodeEnv === 'production') {
    // In production, restrict to extension and configured origins
    // Chrome extension URLs: chrome-extension://<extension-id>
    return [
      'chrome-extension://*', // Allow all extension IDs in production
      ...customOrigins,
    ];
  }

  // In development, allow localhost and any extension
  return [
    'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:5173', // Vite dev server
    'chrome-extension://*',
    ...customOrigins,
  ];
}

function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    if (allowed === origin) return true;
    // Handle wildcard patterns like chrome-extension://*
    if (allowed.endsWith('*')) {
      const pattern = allowed.slice(0, -1);
      return origin.startsWith(pattern);
    }
    return false;
  });
}

export const corsMiddleware = async (c: Context, next: Next) => {
  const origin = c.req.header('origin');
  const allowedOrigins = getAllowedOrigins();
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (isOriginAllowed(origin, allowedOrigins)) {
    c.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  } else if (nodeEnv === 'development') {
    // In dev, allow anyway but log warning
    c.header('Access-Control-Allow-Origin', '*');
    if (origin) {
      console.warn(`[cors] Unexpected origin in development: ${origin}`);
    }
  }

  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '3600');

  if (c.req.method === 'OPTIONS') {
    return c.json({ ok: true }, { status: 200 });
  }

  await next();
};
