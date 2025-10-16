import { WorkerError } from '../types';

/**
 * Request validation utilities
 */

export class RequestValidator {
  /**
   * Parse and validate JSON body
   */
  static async parseJSON<T = any>(request: Request): Promise<T> {
    try {
      const contentType = request.headers.get('content-type');
      
      if (!contentType?.includes('application/json')) {
        throw new WorkerError(
          'Content-Type must be application/json',
          400,
          'INVALID_CONTENT_TYPE'
        );
      }

      const body = await request.json();
      return body as T;
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw new WorkerError(
        'Invalid JSON in request body',
        400,
        'INVALID_JSON'
      );
    }
  }

  /**
   * Validate required fields
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[]
  ): void {
    const missingFields = requiredFields.filter(
      (field) => !(field in data) || data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      throw new WorkerError(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        'MISSING_REQUIRED_FIELDS',
        { missingFields }
      );
    }
  }

  /**
   * Validate API key from Authorization header
   */
  static validateApiKey(
    request: Request,
    validApiKey: string
  ): void {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      throw new WorkerError(
        'Missing Authorization header',
        401,
        'MISSING_AUTH_HEADER'
      );
    }

    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || token !== validApiKey) {
      throw new WorkerError(
        'Invalid API key',
        401,
        'INVALID_API_KEY'
      );
    }
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
