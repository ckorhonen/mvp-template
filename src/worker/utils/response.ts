/**
 * Response utility functions for Cloudflare Workers
 * Provides consistent JSON responses, error handling, and CORS
 */

import { ApiResponse, ApiError } from '../types';

/**
 * CORS headers configuration
 */
const getCorsHeaders = (origin?: string, allowedOrigins?: string): HeadersInit => {
  const allowed = allowedOrigins?.split(',').map(o => o.trim()) || ['*'];
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': '86400',
  };
};

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers: HeadersInit = {},
  corsOrigin?: string,
  allowedOrigins?: string
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(corsOrigin, allowedOrigins),
      ...headers,
    },
  });
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string,
  corsOrigin?: string,
  allowedOrigins?: string
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId,
      timestamp: Date.now(),
    },
  };

  return jsonResponse(response, status, {}, corsOrigin, allowedOrigins);
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  code: string,
  status: number = 400,
  details?: any,
  requestId?: string,
  corsOrigin?: string,
  allowedOrigins?: string
): Response {
  const error: ApiError = {
    code,
    message,
    details,
    statusCode: status,
  };

  const response: ApiResponse = {
    success: false,
    error,
    meta: {
      requestId,
      timestamp: Date.now(),
    },
  };

  return jsonResponse(response, status, {}, corsOrigin, allowedOrigins);
}

/**
 * Handle CORS preflight requests
 */
export function corsPreflightResponse(origin?: string, allowedOrigins?: string): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin, allowedOrigins),
  });
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  badRequest: (message: string = 'Bad request', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'BAD_REQUEST', 400, undefined, requestId, corsOrigin, allowedOrigins),

  unauthorized: (message: string = 'Unauthorized', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'UNAUTHORIZED', 401, undefined, requestId, corsOrigin, allowedOrigins),

  forbidden: (message: string = 'Forbidden', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'FORBIDDEN', 403, undefined, requestId, corsOrigin, allowedOrigins),

  notFound: (message: string = 'Not found', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'NOT_FOUND', 404, undefined, requestId, corsOrigin, allowedOrigins),

  methodNotAllowed: (message: string = 'Method not allowed', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'METHOD_NOT_ALLOWED', 405, undefined, requestId, corsOrigin, allowedOrigins),

  conflict: (message: string = 'Conflict', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'CONFLICT', 409, undefined, requestId, corsOrigin, allowedOrigins),

  rateLimitExceeded: (message: string = 'Rate limit exceeded', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'RATE_LIMIT_EXCEEDED', 429, undefined, requestId, corsOrigin, allowedOrigins),

  internalError: (message: string = 'Internal server error', details?: any, requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'INTERNAL_ERROR', 500, details, requestId, corsOrigin, allowedOrigins),

  serviceUnavailable: (message: string = 'Service unavailable', requestId?: string, corsOrigin?: string, allowedOrigins?: string) =>
    errorResponse(message, 'SERVICE_UNAVAILABLE', 503, undefined, requestId, corsOrigin, allowedOrigins),
};

/**
 * Create a redirect response
 */
export function redirectResponse(url: string, status: 301 | 302 | 307 | 308 = 302): Response {
  return Response.redirect(url, status);
}

/**
 * Create a text response
 */
export function textResponse(text: string, status: number = 200, headers: HeadersInit = {}): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain',
      ...headers,
    },
  });
}

/**
 * Create an HTML response
 */
export function htmlResponse(html: string, status: number = 200, headers: HeadersInit = {}): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html',
      ...headers,
    },
  });
}
