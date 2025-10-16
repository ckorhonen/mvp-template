/**
 * CORS Middleware
 * Handle Cross-Origin Resource Sharing
 */

import { Env } from '../types/env';

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(env: Env): string[] {
  return env.CORS_ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || [];
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes('*') || allowedOrigins.includes(origin);
}

/**
 * CORS middleware - handles preflight and adds CORS headers
 */
export function corsMiddleware(request: Request, env: Env): Response | null {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin, allowedOrigins, env),
    });
  }

  return null;
}

/**
 * Get CORS headers
 */
export function getCorsHeaders(
  origin: string | null,
  allowedOrigins: string[],
  env: Env
): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-API-Key',
    'Access-Control-Max-Age': env.CORS_MAX_AGE || '86400',
  };

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get('Origin');
  const allowedOrigins = getAllowedOrigins(env);
  const corsHeaders = getCorsHeaders(origin, allowedOrigins, env);

  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
