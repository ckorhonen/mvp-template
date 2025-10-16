/**
 * Validation utilities
 */

import type { ValidationResult } from '../types';

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
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate password strength
 */
export function isStrongPassword(password: string): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long',
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
    });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one number',
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Sanitize user input
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

/**
 * Validate required fields
 */
export function validateRequired(
  data: Record<string, unknown>,
  required: string[]
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  for (const field of required) {
    if (!(field in data) || data[field] === null || data[field] === undefined || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
