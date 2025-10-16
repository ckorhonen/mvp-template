/**
 * Response utility functions for Cloudflare Workers
 * Provides consistent JSON responses, error handling, and CORS support
 */

import { CorsOptions } from '../types';

/**
 * Default CORS options
 */
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: 'GET,HEAD,POST,PUT,DELETE,PATCH,OPTIONS',
  headers: 'Content-Type,Authorization,X-Request-ID',
  credentials: false,
  maxAge: 86400,
};

/**
 * Create CORS headers
 */
export function getCorsHeaders(options: Partial<CorsOptions> = {}): Headers {
  const opts = { ...DEFAULT_CORS_OPTIONS, ...options };
  const headers = new Headers();

  headers.set('Access-Control-Allow-Origin', opts.origin);
  headers.set('Access-Control-Allow-Methods', opts.methods);
  headers.set('Access-Control-Allow-Headers', opts.headers);
  
  if (opts.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  if (opts.maxAge) {
    headers.set('Access-Control-Max-Age', opts.maxAge.toString());
  }

  return headers;
}

/**
 * Create security headers
 */
export function getSecurityHeaders(): Headers {
  const headers = new Headers();
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  );
  
  return headers;
}

/**
 * Merge multiple Headers objects
 */
export function mergeHeaders(...headersList: Headers[]): Headers {
  const merged = new Headers();
  
  for (const headers of headersList) {
    headers.forEach((value, key) => {
      merged.set(key, value);
    });
  }
  
  return merged;
}

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: HeadersInit = {}
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Content-Type', 'application/json');
  
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status = 200
): Response {
  return jsonResponse(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    status
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status = 500,
  code?: string,
  details?: unknown
): Response {
  return jsonResponse(
    {
      success: false,
      error: {
        message,
        code: code || `ERROR_${status}`,
        details,
      },
      timestamp: new Date().toISOString(),
    },
    status
  );
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightResponse(
  request: Request,
  corsOptions?: Partial<CorsOptions>
): Response {
  const headers = getCorsHeaders(corsOptions);
  return new Response(null, { status: 204, headers });
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(resource?: string): Response {
  return errorResponse(
    resource ? `${resource} not found` : 'Not found',
    404,
    'NOT_FOUND'
  );
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(
  message: string,
  details?: unknown
): Response {
  return errorResponse(message, 400, 'BAD_REQUEST', details);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Create a 429 Too Many Requests response
 */
export function rateLimitResponse(
  retryAfter?: number,
  message = 'Too many requests'
): Response {
  const headers = new Headers();
  if (retryAfter) {
    headers.set('Retry-After', retryAfter.toString());
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
      timestamp: new Date().toISOString(),
    }),
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalErrorResponse(
  error: Error | unknown,
  includeStack = false
): Response {
  const message = error instanceof Error ? error.message : 'Internal server error';
  const details = includeStack && error instanceof Error ? { stack: error.stack } : undefined;
  
  return errorResponse(message, 500, 'INTERNAL_ERROR', details);
}
