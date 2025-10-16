/**
 * Validation Utilities
 * 
 * Input validation helpers for API requests.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  fields: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  }
  
  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min?: number,
  max?: number
): boolean {
  if (min !== undefined && value.length < min) return false;
  if (max !== undefined && value.length > max) return false;
  return true;
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min?: number,
  max?: number
): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  allowedValues: T[]
): value is T {
  return allowedValues.includes(value as T);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Parse and validate JSON from request
 */
export async function parseAndValidateJSON<T = Record<string, unknown>>(
  request: Request
): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
