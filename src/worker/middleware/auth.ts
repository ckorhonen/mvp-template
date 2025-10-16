import { Middleware, WorkerError } from '../types';
import { RequestValidator } from '../utils/validation';

/**
 * Authentication middleware
 */
export function authMiddleware(
  getApiKey: (env: any) => string
): Middleware {
  return async (request, env, ctx, next) => {
    try {
      const validApiKey = getApiKey(env);
      RequestValidator.validateApiKey(request, validApiKey);
      return await next();
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw new WorkerError(
        'Authentication failed',
        401,
        'AUTH_FAILED'
      );
    }
  };
}

/**
 * Optional authentication middleware (doesn't fail if no auth)
 */
export function optionalAuthMiddleware(
  getApiKey: (env: any) => string
): Middleware {
  return async (request, env, ctx, next) => {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader) {
      try {
        const validApiKey = getApiKey(env);
        RequestValidator.validateApiKey(request, validApiKey);
      } catch (error) {
        // Log but don't fail
        console.warn('Optional auth validation failed:', error);
      }
    }

    return await next();
  };
}
