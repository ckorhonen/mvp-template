/**
 * Health check and status routes
 */

import type { Env } from '../types';
import { jsonResponse } from '../utils/response';

/**
 * GET /health - Basic health check
 */
export async function handleHealthCheck(): Promise<Response> {
  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

/**
 * GET /health/detailed - Detailed health check with service status
 */
export async function handleDetailedHealthCheck(env: Env): Promise<Response> {
  const checks: Record<string, { status: string; message?: string }> = {};

  // Check D1 Database
  try {
    await env.DB.prepare('SELECT 1;').first();
    checks.database = { status: 'healthy' };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check KV
  try {
    await env.CACHE.get('__health_check__');
    checks.kv = { status: 'healthy' };
  } catch (error) {
    checks.kv = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check R2
  try {
    await env.UPLOADS.head('__health_check__');
    checks.r2 = { status: 'healthy' };
  } catch (error) {
    // R2 head returns null for non-existent objects, not an error
    checks.r2 = { status: 'healthy' };
  }

  // Overall status
  const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

  return jsonResponse(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks,
    },
    allHealthy ? 200 : 503
  );
}

/**
 * GET /health/ready - Readiness probe
 */
export async function handleReadinessCheck(): Promise<Response> {
  return jsonResponse({
    ready: true,
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /health/live - Liveness probe
 */
export async function handleLivenessCheck(): Promise<Response> {
  return jsonResponse({
    alive: true,
    timestamp: new Date().toISOString(),
  });
}
