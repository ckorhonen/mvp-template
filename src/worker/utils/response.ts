/**
 * Response Utilities
 * 
 * Helpers for creating standardized JSON responses with proper headers.
 */

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
  cors?: boolean;
  requestId?: string;
}

/**
 * Create a JSON response
 */
export function jsonResponse<T>(
  data: APIResponse<T>,
  options: ResponseOptions = {}
): Response {
  const {
    status = 200,
    headers: customHeaders = {},
    cors = true,
    requestId,
  } = options;

  const headers = new Headers(customHeaders);
  headers.set('Content-Type', 'application/json');

  if (cors) {
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (requestId) {
    headers.set('X-Request-ID', requestId);
  }

  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  options: ResponseOptions = {}
): Response {
  return jsonResponse(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: options.requestId,
      },
    },
    options
  );
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  options: ResponseOptions & { code?: string; details?: unknown } = {}
): Response {
  const { code, details, status = 400, ...restOptions } = options;
  
  return jsonResponse(
    {
      success: false,
      error: {
        message,
        code,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: options.requestId,
      },
    },
    { ...restOptions, status }
  );
}

/**
 * Create a not found response
 */
export function notFoundResponse(message = 'Resource not found'): Response {
  return errorResponse(message, { status: 404, code: 'NOT_FOUND' });
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse(message, { status: 401, code: 'UNAUTHORIZED' });
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse(message, { status: 403, code: 'FORBIDDEN' });
}

/**
 * Create a method not allowed response
 */
export function methodNotAllowedResponse(
  allowed: string[] = ['GET', 'POST']
): Response {
  return errorResponse('Method not allowed', {
    status: 405,
    code: 'METHOD_NOT_ALLOWED',
    headers: { 'Allow': allowed.join(', ') },
  });
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(
  retryAfter: number,
  message = 'Rate limit exceeded'
): Response {
  return errorResponse(message, {
    status: 429,
    code: 'RATE_LIMIT_EXCEEDED',
    headers: { 'Retry-After': retryAfter.toString() },
  });
}

/**
 * Create a server error response
 */
export function serverErrorResponse(
  message = 'Internal server error',
  error?: Error
): Response {
  return errorResponse(message, {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
    details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
  });
}

/**
 * Create a CORS preflight response
 */
export function corsPreflightResponse(allowedOrigin = '*'): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
