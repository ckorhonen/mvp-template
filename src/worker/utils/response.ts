/**
 * Response utility functions for consistent API responses
 */

import type { ApiResponse, ApiError } from '../types/env';

/**
 * Create a successful JSON response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: ApiError | string,
  status: number = 500
): Response {
  const errorObj: ApiError =
    typeof error === 'string'
      ? {
          code: 'INTERNAL_ERROR',
          message: error,
        }
      : error;

  const body: ApiResponse = {
    success: false,
    error: errorObj,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a validation error response
 */
export function validationError(
  message: string,
  details?: Record<string, any>
): Response {
  return errorResponse(
    {
      code: 'VALIDATION_ERROR',
      message,
      details,
    },
    400
  );
}

/**
 * Create a not found error response
 */
export function notFoundError(resource: string = 'Resource'): Response {
  return errorResponse(
    {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    },
    404
  );
}

/**
 * Create an unauthorized error response
 */
export function unauthorizedError(message: string = 'Unauthorized'): Response {
  return errorResponse(
    {
      code: 'UNAUTHORIZED',
      message,
    },
    401
  );
}

/**
 * Create a forbidden error response
 */
export function forbiddenError(message: string = 'Forbidden'): Response {
  return errorResponse(
    {
      code: 'FORBIDDEN',
      message,
    },
    403
  );
}

/**
 * Create a rate limit error response
 */
export function rateLimitError(
  retryAfter?: number
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  const body: ApiResponse = {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests',
      details: retryAfter ? { retryAfter } : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(body), {
    status: 429,
    headers,
  });
}

/**
 * Add CORS headers to a response
 */
export function corsHeaders(
  response: Response,
  allowedOrigins: string[] = ['*']
): Response {
  const newResponse = new Response(response.body, response);
  
  const origin = allowedOrigins.includes('*') ? '*' : allowedOrigins[0];
  
  newResponse.headers.set('Access-Control-Allow-Origin', origin);
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  newResponse.headers.set('Access-Control-Max-Age', '86400');
  
  return newResponse;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(allowedOrigins: string[] = ['*']): Response {
  const origin = allowedOrigins.includes('*') ? '*' : allowedOrigins[0];
  
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
