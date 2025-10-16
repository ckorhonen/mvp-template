/**
 * Error Handling Middleware
 * Global error handler with logging
 */

import { Env } from '../types/env';
import { errorResponse } from '../utils/response';
import { Logger } from '../utils/logger';

/**
 * Custom error classes
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Global error handler
 */
export function errorHandler(error: Error, request: Request, env: Env): Response {
  const logger = new Logger(env);

  // Log the error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Handle known error types
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.code, error.details);
  }

  // Handle unknown errors
  const isDevelopment = env.ENVIRONMENT === 'development';
  const message = isDevelopment ? error.message : 'An unexpected error occurred';
  const details = isDevelopment ? { stack: error.stack } : undefined;

  return errorResponse(message, 500, 'INTERNAL_SERVER_ERROR', details);
}
