/**
 * Base error class for API errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    const details = retryAfter ? { retryAfter } : undefined;
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', details);
    this.name = 'RateLimitError';
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

/**
 * AI Gateway error (502)
 */
export class AIGatewayError extends ApiError {
  constructor(message: string, originalError?: any) {
    super(message, 502, 'AI_GATEWAY_ERROR', { originalError: originalError?.message });
    this.name = 'AIGatewayError';
  }
}

/**
 * Storage error (500)
 */
export class StorageError extends ApiError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 500, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}
