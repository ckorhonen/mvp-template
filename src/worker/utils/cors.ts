import type { Env } from '../types/env';

/**
 * CORS configuration
 */
export interface CorsOptions {
  origins: string[];
  methods?: string[];
  headers?: string[];
  maxAge?: number;
  credentials?: boolean;
}

/**
 * Default CORS options
 */
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origins: ['*'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
  credentials: true,
};

/**
 * Get CORS options from environment
 */
export function getCorsOptions(env: Env): CorsOptions {
  const origins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['*'];
  return {
    ...DEFAULT_CORS_OPTIONS,
    origins,
  };
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: Response, request: Request, options: CorsOptions): Response {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = isOriginAllowed(origin, options.origins) ? origin : options.origins[0];

  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', options.methods?.join(', ') || '');
  headers.set('Access-Control-Allow-Headers', options.headers?.join(', ') || '');
  headers.set('Access-Control-Max-Age', String(options.maxAge || 0));

  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreflightRequest(request: Request, options: CorsOptions): Response {
  const headers = new Headers();
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = isOriginAllowed(origin, options.origins) ? origin : options.origins[0];

  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', options.methods?.join(', ') || '');
  headers.set('Access-Control-Allow-Headers', options.headers?.join(', ') || '');
  headers.set('Access-Control-Max-Age', String(options.maxAge || 0));

  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.includes('*')) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return allowed === origin;
  });
}
