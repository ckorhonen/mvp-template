import type { WorkerContext } from '../types/env';
import type { HealthCheckResponse, ServiceHealth } from '../types/api';
import { successResponse } from '../utils/response';
import { createLogger } from '../utils/logger';

const logger = createLogger('HealthRoutes');

const VERSION = '1.0.0';

/**
 * GET /api/health
 * Health check endpoint
 */
export async function handleHealthCheck(ctx: WorkerContext): Promise<Response> {
  const services: ServiceHealth[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check D1 Database
  const dbHealth = await checkDatabase(ctx);
  services.push(dbHealth);
  if (dbHealth.status !== 'up') {
    overallStatus = dbHealth.status === 'down' ? 'unhealthy' : 'degraded';
  }

  // Check KV
  const kvHealth = await checkKV(ctx);
  services.push(kvHealth);
  if (kvHealth.status !== 'up') {
    overallStatus = 'degraded';
  }

  // Check R2
  const r2Health = await checkR2(ctx);
  services.push(r2Health);
  if (r2Health.status !== 'up') {
    overallStatus = 'degraded';
  }

  const response: HealthCheckResponse = {
    status: overallStatus,
    version: VERSION,
    timestamp: new Date().toISOString(),
    services,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  return successResponse(response, undefined, statusCode);
}

/**
 * Check D1 database connectivity
 */
async function checkDatabase(ctx: WorkerContext): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    await ctx.env.DB.prepare('SELECT 1').first();
    return {
      name: 'database',
      status: 'up',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      name: 'database',
      status: 'down',
      error: String(error),
    };
  }
}

/**
 * Check KV connectivity
 */
async function checkKV(ctx: WorkerContext): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const testKey = '__health_check__';
    await ctx.env.CACHE.put(testKey, 'ok', { expirationTtl: 60 });
    await ctx.env.CACHE.get(testKey);
    await ctx.env.CACHE.delete(testKey);
    return {
      name: 'kv',
      status: 'up',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('KV health check failed', { error });
    return {
      name: 'kv',
      status: 'down',
      error: String(error),
    };
  }
}

/**
 * Check R2 connectivity
 */
async function checkR2(ctx: WorkerContext): Promise<ServiceHealth> {
  const startTime = Date.now();
  try {
    const testKey = '__health_check__';
    await ctx.env.UPLOADS.put(testKey, 'ok');
    await ctx.env.UPLOADS.head(testKey);
    await ctx.env.UPLOADS.delete(testKey);
    return {
      name: 'r2',
      status: 'up',
      latency: Date.now() - startTime,
    };
  } catch (error) {
    logger.error('R2 health check failed', { error });
    return {
      name: 'r2',
      status: 'down',
      error: String(error),
    };
  }
}

/**
 * GET /api/ping
 * Simple ping endpoint
 */
export async function handlePing(ctx: WorkerContext): Promise<Response> {
  return successResponse({ pong: true, timestamp: new Date().toISOString() });
}
