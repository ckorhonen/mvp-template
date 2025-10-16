/**
 * Response Utilities
 * Helper functions for creating HTTP responses
 */

import type { Env } from '../types/env.types';
import { getAllowedOrigins } from '../types/env.types';

// ===========================================
// Response Types
// ===========================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
    [key: string]: any;
  };
}

// ===========================================
// Success Responses
// ===========================================

/**
 * Create a successful JSON response
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a successful response with custom meta
 */
export function jsonResponseWithMeta<T>(
  data: T,
  meta: Record<string, any>,
  status = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      ...meta,
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// ===========================================
// Error Responses
// ===========================================

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status = 500,
  code?: string,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
    meta: {
      timestamp: Date.now(),
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(message: string, details?: any): Response {
  return errorResponse(message, 400, 'BAD_REQUEST', details);
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(message = 'Unauthorized'): Response {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message = 'Forbidden'): Response {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Create a 404 Not Found response
 */
export function notFound(message = 'Not found'): Response {
  return errorResponse(message, 404, 'NOT_FOUND');
}

/**
 * Create a 429 Too Many Requests response
 */
export function tooManyRequests(message = 'Too many requests'): Response {
  return errorResponse(message, 429, 'RATE_LIMIT_EXCEEDED');
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalError(message = 'Internal server error', details?: any): Response {
  return errorResponse(message, 500, 'INTERNAL_ERROR', details);
}

// ===========================================
// CORS Helpers
// ===========================================

/**
 * Get CORS headers
 */
export function getCorsHeaders(
  env: Env,
  origin?: string | null
): Record<string, string> {
  const allowedOrigins = getAllowedOrigins(env);
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Access-Control-Max-Age': env.CORS_MAX_AGE,
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Create a CORS preflight response
 */
export function corsPreflightResponse(env: Env, origin?: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(env, origin),
  });
}

/**
 * Add CORS headers to a response
 */
export function withCors(response: Response, env: Env, origin?: string | null): Response {
  const newResponse = new Response(response.body, response);
  const corsHeaders = getCorsHeaders(env, origin);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}

// ===========================================
// Other Response Types
// ===========================================

/**
 * Create a redirect response
 */
export function redirect(url: string, status = 302): Response {
  return Response.redirect(url, status);
}

/**
 * Create a text response
 */
export function textResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

/**
 * Create an HTML response
 */
export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

/**
 * Create a streaming response
 */
export function streamResponse(stream: ReadableStream, contentType = 'text/event-stream'): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
