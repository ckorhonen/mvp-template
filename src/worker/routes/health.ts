/**
 * Health Check Route Handler
 * System health and status information
 */

import { Env } from '../types/env';
import { jsonResponse } from '../utils/response';

/**
 * Handle health check requests
 */
export async function handleHealth(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();

  // Check various services
  const checks: Record<string, boolean> = {};

  // Check KV
  try {
    await env.CACHE.put('health-check', 'ok', { expirationTtl: 60 });
    await env.CACHE.get('health-check');
    checks.kv = true;
  } catch {
    checks.kv = false;
  }

  // Check D1
  try {
    await env.DB.prepare('SELECT 1').first();
    checks.d1 = true;
  } catch {
    checks.d1 = false;
  }

  // Check R2
  try {
    await env.UPLOADS.head('health-check');
    checks.r2 = true;
  } catch {
    checks.r2 = false;
  }

  const responseTime = Date.now() - startTime;
  const allHealthy = Object.values(checks).every((v) => v);

  return jsonResponse(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT,
      version: env.API_VERSION,
      checks,
      responseTime: `${responseTime}ms`,
    },
    allHealthy ? 200 : 503
  );
}
