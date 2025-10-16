/**
 * Response utility functions for Cloudflare Workers
 * Provides standardized response formatting, error handling, and CORS support
 */

import type { ApiError, ApiResponse } from '../types';

/**
 * CORS headers configuration
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Standard JSON headers
 */
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

/**
 * Create a successful JSON response
 */
export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): Response {
  const error: ApiError = {
    success: false,
    error: {
      message,
      code: code || `ERROR_${status}`,
      details,
    },
  };

  return new Response(JSON.stringify(error), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...CORS_HEADERS,
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Create a streaming response for AI/SSE
 */
export function streamResponse(
  stream: ReadableStream,
  headers: Record<string, string> = {}
): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

/**
 * Common HTTP error responses
 */
export const errorResponses = {
  badRequest: (message: string = 'Bad Request', details?: unknown) =>
    errorResponse(message, 400, 'BAD_REQUEST', details),
  
  unauthorized: (message: string = 'Unauthorized') =>
    errorResponse(message, 401, 'UNAUTHORIZED'),
  
  forbidden: (message: string = 'Forbidden') =>
    errorResponse(message, 403, 'FORBIDDEN'),
  
  notFound: (message: string = 'Not Found') =>
    errorResponse(message, 404, 'NOT_FOUND'),
  
  methodNotAllowed: (message: string = 'Method Not Allowed') =>
    errorResponse(message, 405, 'METHOD_NOT_ALLOWED'),
  
  conflict: (message: string = 'Conflict') =>
    errorResponse(message, 409, 'CONFLICT'),
  
  tooManyRequests: (message: string = 'Too Many Requests') =>
    errorResponse(message, 429, 'RATE_LIMIT_EXCEEDED'),
  
  internalError: (message: string = 'Internal Server Error', details?: unknown) =>
    errorResponse(message, 500, 'INTERNAL_ERROR', details),
  
  serviceUnavailable: (message: string = 'Service Unavailable') =>
    errorResponse(message, 503, 'SERVICE_UNAVAILABLE'),
};

/**
 * Redirect response
 */
export function redirectResponse(
  url: string,
  status: 301 | 302 | 307 | 308 = 302
): Response {
  return Response.redirect(url, status);
}

/**
 * No content response
 */
export function noContentResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
