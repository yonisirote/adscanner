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

  if (config.urlvoidApiKey) {
    services.push('URLVoid');
  } else {
    console.warn('[startup] URLVoid API key not configured - using mock data');
  }

  if (config.scamadvisorApiKey) {
    services.push('Scamadvisor');
  } else {
    console.warn('[startup] Scamadvisor API key not configured - using mock data');
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

const server = Bun.serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`[startup] Server running on http://localhost:${server.port}`);

export default app;
