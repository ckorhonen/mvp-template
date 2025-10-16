/**
 * Request validation utilities
 */

import { errorResponse } from './response';

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): string | null {
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined || data[field] === null) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<T | Response> {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 400);
    }

    const body = await request.json();
    return body as T;
  } catch (error) {
    return errorResponse('Invalid JSON body', 400);
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
  );

  return { page, limit };
}
