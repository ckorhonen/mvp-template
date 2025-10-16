/**
 * Validation Utilities
 * 
 * Helper functions for input validation.
 */

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => string | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Validate data against rules
 */
export function validate(data: any, rules: ValidationRule[]): ValidationResult {
  const errors: Record<string, string[]> = {};

  for (const rule of rules) {
    const value = data[rule.field];
    const fieldErrors: string[] = [];

    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
      fieldErrors.push(`${rule.field} is required`);
      errors[rule.field] = fieldErrors;
      continue;
    }

    // Skip other validations if value is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Check type
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        fieldErrors.push(`${rule.field} must be a ${rule.type}`);
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        fieldErrors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        fieldErrors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        fieldErrors.push(`${rule.field} format is invalid`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        fieldErrors.push(`${rule.field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        fieldErrors.push(`${rule.field} must be at most ${rule.max}`);
      }
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      fieldErrors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        fieldErrors.push(customError);
      }
    }

    if (fieldErrors.length > 0) {
      errors[rule.field] = fieldErrors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Common validation patterns
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  phoneUS: /^\+?1?[-.]?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}$/,
};

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>"']/g, '');
}

/**
 * Parse and validate JSON
 */
export function parseJSON<T = any>(input: string): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(input);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Invalid JSON' };
  }
}
