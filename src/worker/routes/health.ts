/**
 * Health Check Routes
 * 
 * Simple health check endpoints for monitoring
 */

import { Env } from '../types';
import { createSuccessResponse } from '../utils/response';

/**
 * GET /health
 * Basic health check
 */
export async function handleHealthCheck(
  request: Request,
  env: Env
): Promise<Response> {
  return createSuccessResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: env.API_VERSION || 'v1',
  });
}

/**
 * GET /health/ready
 * Readiness check (checks if all services are available)
 */
export async function handleReadinessCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const checks: Record<string, boolean> = {
    worker: true,
  };

  // Check D1 database
  try {
    await env.DB.prepare('SELECT 1').first();
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  // Check KV namespace
  try {
    await env.CACHE.get('health-check');
    checks.kv = true;
  } catch (error) {
    checks.kv = false;
  }

  const allHealthy = Object.values(checks).every((check) => check);

  return createSuccessResponse(
    {
      status: allHealthy ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      checks,
    },
    allHealthy ? 200 : 503
  );
}

/**
 * GET /health/live
 * Liveness check (basic check that the worker is running)
 */
export async function handleLivenessCheck(
  request: Request,
  env: Env
): Promise<Response> {
  return createSuccessResponse({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}
