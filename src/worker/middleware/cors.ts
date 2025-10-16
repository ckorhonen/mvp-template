/**
 * CORS middleware
 */

import type { Context, Middleware } from '../types';
import { corsPreflightResponse } from '../utils/response';

export interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

/**
 * CORS middleware
 */
export function cors(options: CorsOptions = {}): Middleware {
  const {
    allowedOrigins = ['*'],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders = [],
    maxAge = 86400,
    credentials = true,
  } = options;

  return async (ctx: Context, next) => {
    const origin = ctx.request.headers.get('Origin');
    const requestMethod = ctx.request.method;

    // Handle preflight request
    if (requestMethod === 'OPTIONS') {
      const response = new Response(null, { status: 204 });
      
      if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }
      
      response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
      
      if (exposedHeaders.length > 0) {
        response.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
      }
      
      response.headers.set('Access-Control-Max-Age', maxAge.toString());
      
      if (credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      return response;
    }

    // Handle actual request
    const response = await next();
    
    if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    if (exposedHeaders.length > 0) {
      response.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    return response;
  };
}
