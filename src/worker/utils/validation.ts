/**
 * Request Validation Utilities
 * Provides schema validation and request parsing
 */

import { ValidationError } from './errors';

export type ValidationSchema = Record<string, FieldValidator>;

export interface FieldValidator {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
}

/**
 * Validate data against a schema
 * @param data - Data to validate
 * @param schema - Validation schema
 * @throws ValidationError if validation fails
 */
export function validate(data: any, schema: ValidationSchema): void {
  const errors: Record<string, string> = {};

  for (const [field, validator] of Object.entries(schema)) {
    const value = data[field];

    // Check required fields
    if (validator.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip validation if field is optional and not provided
    if (!validator.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    const error = validateType(value, validator, field);
    if (error) {
      errors[field] = error;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }
}

function validateType(value: any, validator: FieldValidator, field: string): string | null {
  switch (validator.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${field} must be a string`;
      }
      if (validator.min !== undefined && value.length < validator.min) {
        return `${field} must be at least ${validator.min} characters`;
      }
      if (validator.max !== undefined && value.length > validator.max) {
        return `${field} must be at most ${validator.max} characters`;
      }
      if (validator.pattern && !validator.pattern.test(value)) {
        return `${field} format is invalid`;
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `${field} must be a number`;
      }
      if (validator.min !== undefined && value < validator.min) {
        return `${field} must be at least ${validator.min}`;
      }
      if (validator.max !== undefined && value > validator.max) {
        return `${field} must be at most ${validator.max}`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${field} must be a boolean`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `${field} must be an array`;
      }
      if (validator.min !== undefined && value.length < validator.min) {
        return `${field} must have at least ${validator.min} items`;
      }
      if (validator.max !== undefined && value.length > validator.max) {
        return `${field} must have at most ${validator.max} items`;
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `${field} must be an object`;
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !isValidEmail(value)) {
        return `${field} must be a valid email address`;
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !isValidUrl(value)) {
        return `${field} must be a valid URL`;
      }
      break;
  }

  // Enum validation
  if (validator.enum && !validator.enum.includes(value)) {
    return `${field} must be one of: ${validator.enum.join(', ')}`;
  }

  // Custom validation
  if (validator.custom) {
    const result = validator.custom(value);
    if (result !== true) {
      return typeof result === 'string' ? result : `${field} validation failed`;
    }
  }

  return null;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse and validate JSON request body
 * @param request - Request object
 * @param schema - Optional validation schema
 * @returns Parsed and validated data
 */
export async function parseJsonBody<T = any>(
  request: Request,
  schema?: ValidationSchema
): Promise<T> {
  const contentType = request.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) {
    throw new ValidationError('Content-Type must be application/json');
  }

  let data: any;
  try {
    data = await request.json();
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }

  if (schema) {
    validate(data, schema);
  }

  return data as T;
}

/**
 * Parse and validate URL query parameters
 * @param url - URL object
 * @param schema - Optional validation schema
 * @returns Parsed and validated parameters
 */
export function parseQueryParams(
  url: URL,
  schema?: ValidationSchema
): Record<string, any> {
  const params: Record<string, any> = {};
  
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  if (schema) {
    validate(params, schema);
  }

  return params;
}
