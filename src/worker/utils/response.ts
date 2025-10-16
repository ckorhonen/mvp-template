/**
 * Response Utilities for Cloudflare Workers
 * Provides standardized response formatting
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

/**
 * Create a standardized JSON success response
 * @param data - Response data
 * @param status - HTTP status code
 * @param meta - Additional metadata
 * @returns JSON Response
 */
export function jsonResponse<T>(
  data: T,
  status: number = 200,
  meta?: Record<string, any>
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
 * Create a standardized JSON error response
 * @param message - Error message
 * @param status - HTTP status code
 * @param code - Error code
 * @param details - Additional error details
 * @returns JSON Response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      message,
      code,
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
    },
  });
}

/**
 * Create a no content response
 * @returns 204 No Content Response
 */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create a redirect response
 * @param url - Redirect URL
 * @param permanent - Whether redirect is permanent (301 vs 302)
 * @returns Redirect Response
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
 * Create a streaming response
 * @param stream - ReadableStream to send
 * @param contentType - Content type header
 * @returns Streaming Response
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
