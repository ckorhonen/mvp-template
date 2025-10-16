/**
 * Response Utilities
 * 
 * Helper functions for creating standardized HTTP responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ResponseOptions {
  headers?: Record<string, string>;
  status?: number;
  requestId?: string;
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(
  data: T,
  options: ResponseOptions = {},
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return new Response(JSON.stringify(response), {
    status: options.status || 200,
    headers,
  });
}

/**
 * Create an error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  options: ResponseOptions & { details?: any } = {},
): Response {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details: options.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: options.requestId,
    },
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return new Response(JSON.stringify(response), {
    status: options.status || 500,
    headers,
  });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(
  message: string = 'Bad Request',
  options: ResponseOptions & { details?: any } = {},
): Response {
  return createErrorResponse('BAD_REQUEST', message, {
    ...options,
    status: 400,
  });
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(
  message: string = 'Unauthorized',
  options: ResponseOptions = {},
): Response {
  return createErrorResponse('UNAUTHORIZED', message, {
    ...options,
    status: 401,
  });
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(
  message: string = 'Forbidden',
  options: ResponseOptions = {},
): Response {
  return createErrorResponse('FORBIDDEN', message, {
    ...options,
    status: 403,
  });
}

/**
 * Create a 404 Not Found response
 */
export function notFound(
  message: string = 'Not Found',
  options: ResponseOptions = {},
): Response {
  return createErrorResponse('NOT_FOUND', message, {
    ...options,
    status: 404,
  });
}

/**
 * Create a 429 Too Many Requests response
 */
export function tooManyRequests(
  message: string = 'Too Many Requests',
  options: ResponseOptions & { retryAfter?: number } = {},
): Response {
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.retryAfter) {
    headers['Retry-After'] = options.retryAfter.toString();
  }

  return createErrorResponse('RATE_LIMIT_EXCEEDED', message, {
    ...options,
    status: 429,
    headers,
  });
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalServerError(
  message: string = 'Internal Server Error',
  options: ResponseOptions & { details?: any } = {},
): Response {
  return createErrorResponse('INTERNAL_SERVER_ERROR', message, {
    ...options,
    status: 500,
  });
}

/**
 * Create a 503 Service Unavailable response
 */
export function serviceUnavailable(
  message: string = 'Service Unavailable',
  options: ResponseOptions = {},
): Response {
  return createErrorResponse('SERVICE_UNAVAILABLE', message, {
    ...options,
    status: 503,
  });
}

/**
 * Create a redirect response
 */
export function redirect(
  url: string,
  options: { permanent?: boolean; headers?: Record<string, string> } = {},
): Response {
  return new Response(null, {
    status: options.permanent ? 301 : 302,
    headers: {
      Location: url,
      ...options.headers,
    },
  });
}

/**
 * Create a JSON response with custom status
 */
export function json<T>(
  data: T,
  options: ResponseOptions = {},
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers,
  });
}

/**
 * Create a text response
 */
export function text(
  content: string,
  options: ResponseOptions = {},
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
    ...options.headers,
  };

  return new Response(content, {
    status: options.status || 200,
    headers,
  });
}

/**
 * Create an HTML response
 */
export function html(
  content: string,
  options: ResponseOptions = {},
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'text/html',
    ...options.headers,
  };

  return new Response(content, {
    status: options.status || 200,
    headers,
  });
}
