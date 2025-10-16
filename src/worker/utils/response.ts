/**
 * Response utilities for consistent API responses
 */

import type { ApiResponse, ApiError } from '../types';

/**
 * Create a successful JSON response
 */
export function successResponse<T>(
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
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: ApiError | string,
  status: number = 500,
  meta?: Record<string, unknown>
): Response {
  const apiError: ApiError =
    typeof error === 'string'
      ? { code: 'INTERNAL_ERROR', message: error }
      : error;

  const response: ApiResponse = {
    success: false,
    error: apiError,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
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
 * Create a not found response
 */
export function notFoundResponse(message: string = 'Not found'): Response {
  return errorResponse(
    {
      code: 'NOT_FOUND',
      message,
    },
    404
  );
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): Response {
  return errorResponse(
    {
      code: 'UNAUTHORIZED',
      message,
    },
    401
  );
}

/**
 * Create a forbidden response
 */
export function forbiddenResponse(message: string = 'Forbidden'): Response {
  return errorResponse(
    {
      code: 'FORBIDDEN',
      message,
    },
    403
  );
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string = 'Bad request'): Response {
  return errorResponse(
    {
      code: 'BAD_REQUEST',
      message,
    },
    400
  );
}

/**
 * Create a method not allowed response
 */
export function methodNotAllowedResponse(
  allowed: string[]
): Response {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      'Allow': allowed.join(', '),
    },
  });
}

/**
 * Create CORS preflight response
 */
export function corsPreflightResponse(
  allowedOrigin: string = '*',
  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: string[] = ['Content-Type', 'Authorization']
): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': allowedMethods.join(', '),
      'Access-Control-Allow-Headers': allowedHeaders.join(', '),
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(
  response: Response,
  allowedOrigin: string = '*'
): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
  return newResponse;
}
