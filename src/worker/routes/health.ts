/**
 * Health check API route
 * Monitor service health and dependencies
 */

import { Env, HealthCheckResponse } from '../types';
import { jsonResponse } from '../utils/response';
import { createLogger } from '../utils/logger';

/**
 * GET /api/health
 * Health check endpoint
 */
export async function handleHealthCheck(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'health');
  const origin = request.headers.get('Origin') || undefined;

  const checks = await Promise.allSettled([
    checkDatabase(env),
    checkKV(env),
    checkR2(env),
    checkAI(env),
  ]);

  const [dbCheck, kvCheck, r2Check, aiCheck] = checks.map(result => 
    result.status === 'fulfilled' ? result.value : { status: 'down' as const, latency: undefined }
  );

  const allHealthy = [
    dbCheck.status,
    kvCheck.status,
    r2Check.status,
    // AI is optional, don't fail health check if it's down
  ].every(status => status === 'up');

  const response: HealthCheckResponse = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: Date.now(),
    services: {
      database: dbCheck,
      kv: kvCheck,
      r2: r2Check,
      ai: aiCheck,
    },
    version: '1.0.0',
  };

  const statusCode = allHealthy ? 200 : 503;

  logger.info('Health check completed', { status: response.status });

  return jsonResponse(
    response,
    statusCode,
    {},
    origin,
    env.CORS_ALLOWED_ORIGINS
  );
}

/**
 * Check D1 database health
 */
async function checkDatabase(env: Env): Promise<{ status: 'up' | 'down'; latency?: number }> {
  try {
    const start = Date.now();
    await env.DB.prepare('SELECT 1').first();
    const latency = Date.now() - start;
    return { status: 'up', latency };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { status: 'down' };
  }
}

/**
 * Check KV namespace health
 */
async function checkKV(env: Env): Promise<{ status: 'up' | 'down'; latency?: number }> {
  try {
    const start = Date.now();
    const testKey = '__health_check__';
    await env.CACHE.put(testKey, 'ok', { expirationTtl: 10 });
    await env.CACHE.get(testKey);
    await env.CACHE.delete(testKey);
    const latency = Date.now() - start;
    return { status: 'up', latency };
  } catch (error) {
    console.error('KV health check failed:', error);
    return { status: 'down' };
  }
}

/**
 * Check R2 bucket health
 */
async function checkR2(env: Env): Promise<{ status: 'up' | 'down'; latency?: number }> {
  try {
    const start = Date.now();
    await env.STORAGE.list({ limit: 1 });
    const latency = Date.now() - start;
    return { status: 'up', latency };
  } catch (error) {
    console.error('R2 health check failed:', error);
    return { status: 'down' };
  }
}

/**
 * Check AI service health
 */
async function checkAI(env: Env): Promise<{ status: 'up' | 'down'; latency?: number }> {
  try {
    // AI Gateway check would go here
    // For now, just return up if the API key is configured
    if (env.OPENAI_API_KEY) {
      return { status: 'up' };
    }
    return { status: 'down' };
  } catch (error) {
    console.error('AI health check failed:', error);
    return { status: 'down' };
  }
}
