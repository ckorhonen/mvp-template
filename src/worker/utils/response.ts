import type { ApiResponse, ApiError, ResponseMeta } from '../types/api';

/**
 * Create a standardized success response
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>,
  status: number = 200
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
    },
  });
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  error: Error | ApiError,
  status: number = 500,
  includeStack: boolean = false
): Response {
  const apiError: ApiError = {
    code: 'code' in error ? (error as any).code : 'INTERNAL_ERROR',
    message: error.message,
    details: 'details' in error ? (error as any).details : undefined,
    stack: includeStack ? error.stack : undefined,
  };

  const response: ApiResponse = {
    success: false,
    error: apiError,
    meta: {
      timestamp: new Date().toISOString(),
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
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  perPage: number,
  total: number,
  status: number = 200
): Response {
  const meta: ResponseMeta = {
    page,
    perPage,
    total,
    timestamp: new Date().toISOString(),
  };

  return successResponse(data, meta, status);
}

/**
 * Create a no-content response (204)
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

/**
 * Create a streaming response for Server-Sent Events
 */
export function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
