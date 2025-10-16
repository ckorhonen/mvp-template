/**
 * Response Utility Functions
 * Helpers for creating standardized API responses
 */

import type { ApiResponse, ErrorResponse } from '../types/api';

/**
 * Create a successful JSON response
 */
export function successResponse<T = unknown>(
  data: T,
  status: number = 200,
  meta?: Record<string, unknown>
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: unknown
): Response {
  const response: ErrorResponse = {
    success: false,
    error: {
      message,
      code: code || `ERROR_${status}`,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(resource: string = 'Resource'): Response {
  return errorResponse(`${resource} not found`, 404, 'NOT_FOUND');
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): Response {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalErrorResponse(
  message: string = 'Internal server error',
  details?: unknown
): Response {
  return errorResponse(message, 500, 'INTERNAL_ERROR', details);
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(
  message: string = 'Bad request',
  details?: unknown
): Response {
  return errorResponse(message, 400, 'BAD_REQUEST', details);
}

/**
 * Create a CORS response
 */
export function corsResponse(
  response: Response,
  origin: string = '*'
): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', origin);
  newResponse.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  newResponse.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  return newResponse;
}

/**
 * Handle CORS preflight
 */
export function corsPreflightResponse(origin: string = '*'): Response {
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

/**
 * Create a redirect response
 */
export function redirectResponse(
  url: string,
  status: number = 302
): Response {
  return Response.redirect(url, status);
}

/**
 * Create a streaming response
 */
export function streamResponse(
  stream: ReadableStream,
  contentType: string = 'text/event-stream'
): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
