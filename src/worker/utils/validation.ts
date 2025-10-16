/**
 * Input validation utilities using Zod
 * Provides type-safe validation for API requests
 */

import { z } from 'zod';
import { badRequestResponse } from './response';

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  try {
    const contentType = request.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) {
      throw new Error('Content-Type must be application/json');
    }

    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request body', error.errors);
    }
    throw error;
  }
}

/**
 * Validate URL search params against a Zod schema
 */
export function validateSearchParams<T extends z.ZodTypeAny>(
  url: URL,
  schema: T
): z.infer<T> {
  try {
    const params = Object.fromEntries(url.searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid query parameters', error.errors);
    }
    throw error;
  }
}

/**
 * Validate path parameters
 */
export function validatePathParams<T extends z.ZodTypeAny>(
  params: Record<string, string>,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid path parameters', error.errors);
    }
    throw error;
  }
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError['errors']
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  toResponse(): Response {
    return badRequestResponse(this.message, {
      validationErrors: this.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });
  }
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /** Pagination parameters */
  pagination: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z
      .string()
      .regex(/^\d+$/)
      .transform(Number)
      .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
      .default('10'),
  }),

  /** UUID parameter */
  uuid: z.string().uuid(),

  /** Email validation */
  email: z.string().email(),

  /** URL validation */
  url: z.string().url(),

  /** ISO date string */
  isoDate: z.string().datetime(),

  /** Positive integer */
  positiveInt: z.number().int().positive(),

  /** Non-empty string */
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
};
