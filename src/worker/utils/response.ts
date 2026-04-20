/**
 * Response Utility Functions
 * Helper functions for creating consistent API responses
 */

import { APIResponse } from '../types/api';

/**
 * Create a JSON response with proper headers
 */
export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  const response: APIResponse<T> = {
    success: status >= 200 && status < 300,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create an error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): Response {
  const response: APIResponse = {
    success: false,
    error: {
      message,
      code,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a success response
 */
export function successResponse<T>(data: T, message?: string): Response {
  return jsonResponse({ ...data, message }, 200);
}

/**
 * Create a created response (201)
 */
export function createdResponse<T>(data: T, message?: string): Response {
  return jsonResponse({ ...data, message }, 201);
}

/**
 * Create a no content response (204)
 */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create a redirect response
 */
export function redirectResponse(url: string, permanent: boolean = false): Response {
  return new Response(null, {
    status: permanent ? 301 : 302,
    headers: {
      Location: url,
    },
  });
}
