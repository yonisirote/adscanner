import type { Context } from 'hono';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();
const LIMIT = 60; // requests per minute
const WINDOW = 60 * 1000; // 1 minute in milliseconds

function getClientIp(c: Context): string {
  return c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
}

export async function rateLimitMiddleware(c: Context, next: () => Promise<void>): Promise<void | Response> {
  const clientIp = getClientIp(c);
  const now = Date.now();

  let entry = store.get(clientIp);

  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + WINDOW };
    store.get(clientIp) && store.delete(clientIp);
  }

  entry.count++;
  store.set(clientIp, entry);

  // Set rate limit headers
  const remaining = Math.max(0, LIMIT - entry.count);
  const resetIn = Math.ceil((entry.resetTime - now) / 1000);
  
  c.header('X-RateLimit-Limit', LIMIT.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', entry.resetTime.toString());

  if (entry.count > LIMIT) {
    console.warn(`[rate-limit] Client ${clientIp} exceeded limit (${entry.count}/${LIMIT}), reset in ${resetIn}s`);
    return c.json(
      { 
        error: 'Rate limit exceeded',
        retryAfter: resetIn,
        limit: LIMIT,
        window: '1 minute',
      }, 
      { status: 429, headers: { 'Retry-After': resetIn.toString() } }
    );
  }

  await next();
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime + WINDOW) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000); // every 5 minutes
