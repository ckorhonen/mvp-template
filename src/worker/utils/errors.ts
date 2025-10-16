/**
 * Custom error classes and error handling utilities
 */

import type { ApiError } from '../types/env';
import { errorResponse } from './response';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(public retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
      retryAfter,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('DATABASE_ERROR', message, 500, details);
    this.name = 'DatabaseError';
  }
}

/**
 * External API error
 */
export class ExternalApiError extends AppError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super('EXTERNAL_API_ERROR', `${service}: ${message}`, 502, details);
    this.name = 'ExternalApiError';
  }
}

/**
 * Global error handler
 */
export function handleError(error: unknown): Response {
  console.error('Error:', error);

  if (error instanceof AppError) {
    return errorResponse(error.toApiError(), error.statusCode);
  }

  if (error instanceof Error) {
    return errorResponse(
      {
        code: 'INTERNAL_ERROR',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      500
    );
  }

  return errorResponse(
    {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
    },
    500
  );
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  handler: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>
) {
  return async (request: Request, env: any, ctx: ExecutionContext): Promise<Response> => {
    try {
      return await handler(request, env, ctx);
    } catch (error) {
      return handleError(error);
    }
  };
}
