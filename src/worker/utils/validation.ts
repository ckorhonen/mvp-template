/**
 * Request validation utilities
 * Provides schema validation, input sanitization, and type guards
 */

import { z } from 'zod';
import type { ZodSchema } from 'zod';

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON body',
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  url: URL,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
    };
  }
  
  return { success: true, data: result.data };
}

/**
 * Common validation schemas
 */
export const schemas = {
  id: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email address'),
  url: z.string().url('Invalid URL'),
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
  
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  
  timestamp: z.string().datetime('Invalid ISO 8601 timestamp'),
};

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Type guard for checking if value is a valid JSON object
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Validate API key format
 */
export function isValidApiKey(key: string): boolean {
  // Example: key should be alphanumeric, 32+ characters
  return /^[a-zA-Z0-9_-]{32,}$/.test(key);
}

/**
 * Extract and validate bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Validate request content type
 */
export function isJsonContentType(request: Request): boolean {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}
