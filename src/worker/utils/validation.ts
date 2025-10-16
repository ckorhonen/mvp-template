/**
 * Request validation utilities
 */

import { validationError } from './response';

/**
 * Validate required fields in an object
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(String(field));
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Parse and validate JSON request body
 */
export async function parseJsonBody<T = any>(request: Request): Promise<T> {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Invalid JSON body'
    );
  }
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

/**
 * Type guard for checking if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if value is an object
 */
export function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
