// ===========================================
// Response Utilities
// Helper functions for creating standardized responses
// ===========================================

import type { ApiResponse } from '../types';
import { ApiError, ErrorCode } from '../types';

/**
 * Create a success JSON response
 */
export function successResponse<T = any>(
  data: T,
  meta?: ApiResponse['meta']
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: ApiError | Error,
  requestId?: string
): Response {
  const isApiError = error instanceof ApiError;
  
  const response: ApiResponse = {
    success: false,
    error: {
      code: isApiError ? error.code : ErrorCode.INTERNAL_ERROR,
      message: error.message,
      details: isApiError ? error.details : undefined,
    },
    meta: requestId ? {
      requestId,
      timestamp: new Date().toISOString(),
      duration: 0,
    } : undefined,
  };

  return new Response(JSON.stringify(response), {
    status: isApiError ? error.statusCode : 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T = any>(
  data: T[],
  pagination: {
    page: number;
    perPage: number;
    total: number;
  }
): Response {
  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      duration: 0,
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.perPage),
    } as any,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a no content response
 */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create a redirect response
 */
export function redirectResponse(url: string, permanent: boolean = false): Response {
  return Response.redirect(url, permanent ? 301 : 302);
}

/**
 * Create a CORS-enabled response
 */
export function corsResponse(
  response: Response,
  allowedOrigins: string[],
  origin?: string
): Response {
  const headers = new Headers(response.headers);

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create a streaming response
 */
export function streamResponse(stream: ReadableStream, contentType: string = 'text/plain'): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      'Transfer-Encoding': 'chunked',
    },
  });
}

/**
 * Create a Server-Sent Events response
 */
export function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Parse request body as JSON
 */
export async function parseJsonBody<T = any>(request: Request): Promise<T> {
  try {
    return await request.json<T>();
  } catch (error) {
    throw new ApiError(
      ErrorCode.BAD_REQUEST,
      'Invalid JSON body',
      400
    );
  }
}

/**
 * Parse URL query parameters
 */
export function parseQueryParams(url: URL): Record<string, string> {
  const params: Record<string, string> = {};
  
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Validate required fields in an object
 */
export function validateRequired<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): void {
  const missing = fields.filter(field => !(field in data) || data[field] === undefined || data[field] === null);

  if (missing.length > 0) {
    throw new ApiError(
      ErrorCode.VALIDATION_ERROR,
      `Missing required fields: ${missing.join(', ')}`,
      400,
      { missing }
    );
  }
}
