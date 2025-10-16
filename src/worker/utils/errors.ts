/**
 * Custom Error Classes and Error Handling Utilities
 * Provides structured error handling for Cloudflare Workers
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    public originalError?: Error
  ) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      originalError: originalError?.message,
    });
  }
}

/**
 * Handle errors and return appropriate Response
 * @param error - The error to handle
 * @returns JSON Response with error details
 */
export function handleError(error: unknown): Response {
  console.error('Error occurred:', error);

  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Handle unknown errors
  const genericError = new AppError(
    'An unexpected error occurred',
    500,
    'INTERNAL_SERVER_ERROR'
  );

  return new Response(JSON.stringify(genericError.toJSON()), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Async error handler wrapper for route handlers
 * @param handler - Async route handler function
 * @returns Wrapped handler with error handling
 */
export function asyncHandler(
  handler: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>
) {
  return async (
    request: Request,
    env: any,
    ctx: ExecutionContext
  ): Promise<Response> => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      return handleError(error);
    }
  };
}
