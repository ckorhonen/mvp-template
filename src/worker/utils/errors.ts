/**
 * Error Handling Utilities
 * 
 * Standardized error handling for Cloudflare Workers
 */

export class APIError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends APIError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends APIError {
  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Error | APIError,
  includeStack = false
): Response {
  const statusCode = error instanceof APIError ? error.statusCode : 500;
  const code = error instanceof APIError ? error.code : 'INTERNAL_ERROR';
  const details = error instanceof APIError ? error.details : undefined;

  const body: any = {
    error: {
      message: error.message,
      code,
      statusCode,
    },
  };

  if (details) {
    body.error.details = details;
  }

  if (includeStack && error.stack) {
    body.error.stack = error.stack;
  }

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handle errors in async handlers
 */
export function handleError(error: unknown, includeStack = false): Response {
  console.error('Error:', error);

  if (error instanceof APIError) {
    return createErrorResponse(error, includeStack);
  }

  if (error instanceof Error) {
    return createErrorResponse(
      new APIError(error.message, 500, 'INTERNAL_ERROR'),
      includeStack
    );
  }

  return createErrorResponse(
    new APIError('An unknown error occurred', 500, 'UNKNOWN_ERROR'),
    false
  );
}

/**
 * Async error wrapper for handlers
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  includeStack = false
): (...args: T) => Promise<R | Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error, includeStack);
    }
  };
}
