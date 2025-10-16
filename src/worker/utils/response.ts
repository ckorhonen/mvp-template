/**
 * Response utility functions for consistent API responses
 */

import { ApiResponse, AppError } from '../types';

export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function successResponse<T>(
  data: T,
  requestId: string,
  durationMs?: number
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      duration_ms: durationMs,
    },
  };
  return jsonResponse(response);
}

export function errorResponse(
  error: AppError | Error,
  requestId: string
): Response {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';
  
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message: error.message,
      details: isAppError ? error.details : undefined,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };
  
  return jsonResponse(response, statusCode);
}

export function corsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function addCorsHeaders(response: Response, origin: string = '*'): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
