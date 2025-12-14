import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import checkRouter from './routes/check';
import { getConfig } from './config';
import type { HealthResponse } from './types';

const app = new Hono();

// Validate configuration on startup
function validateStartupConfig(): void {
  const config = getConfig();
  const services = [];

  if (config.virusTotalApiKey) {
    services.push('VirusTotal');
  } else {
    console.warn('[startup] VirusTotal API key not configured - using mock data');
  }

  if (config.googleSafeBrowsingApiKey) {
    services.push('Google Safe Browsing');
  } else {
    console.warn('[startup] Google Safe Browsing API key not configured - using mock data');
  }

  if (services.length > 0) {
    console.log(`[startup] Enabled services: ${services.join(', ')}`);
  }
}

app.use(corsMiddleware);
app.use(rateLimitMiddleware);

app.get('/health', (c) => {
  const response: HealthResponse = { status: 'ok' };
  return c.json(response);
});

// Test endpoint for development - returns controlled risk scores
app.post('/api/test-check', async (c) => {
  const { url } = await c.req.json();
  
  if (!url) {
    return c.json({ error: 'URL is required' }, { status: 400 });
  }

  // Determine risk based on URL keywords (for testing only)
  let riskScore = 0;
  let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'dangerous' = 'safe';

  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('dangerous') || urlLower.includes('high-risk')) {
    riskScore = 85;
    riskLevel = 'dangerous';
  } else if (urlLower.includes('high') || urlLower.includes('risky')) {
    riskScore = 68;
    riskLevel = 'high';
  } else if (urlLower.includes('medium')) {
    riskScore = 45;
    riskLevel = 'medium';
  } else if (urlLower.includes('low')) {
    riskScore = 15;
    riskLevel = 'low';
  } else if (urlLower.includes('safe')) {
    riskScore = 5;
    riskLevel = 'safe';
  } else {
    // Random for other test URLs
    riskScore = Math.floor(Math.random() * 100);
    if (riskScore >= 70) riskLevel = 'dangerous';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 30) riskLevel = 'medium';
    else if (riskScore >= 10) riskLevel = 'low';
  }

  console.log(`[TEST] ${url} -> ${riskLevel} (${riskScore})`);

  return c.json({
    url,
    riskScore,
    riskLevel,
    sources: [
      {
        source: 'test-urlvoid',
        score: riskScore * 0.3,
        details: { mode: 'test' },
      },
      {
        source: 'test-scamadvisor',
        score: riskScore * 0.7,
        details: { mode: 'test' },
      },
    ],
    cached: false,
    checkedAt: new Date().toISOString(),
    testMode: true,
  });
});

app.route('/api/check', checkRouter);

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
});

// Startup validation
validateStartupConfig();

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = process.env.CORS_ORIGINS || 'chrome-extension://*';

console.log(`[startup] Environment: ${NODE_ENV}`);
console.log(`[startup] CORS Origins: ${CORS_ORIGINS}`);

const server = Bun.serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`[startup] Server running on http://localhost:${server.port}`);
console.log('[startup] Ready to accept connections');

export default app;
