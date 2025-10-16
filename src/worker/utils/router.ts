/**
 * Simple but powerful router for Cloudflare Workers
 */

import { Route, RouteHandler, Env, RequestContext, AppError } from '../types';
import { errorResponse } from './response';
import { createLogger } from './logger';

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string | RegExp, handler: RouteHandler): void {
    const regex = typeof path === 'string' ? this.pathToRegex(path) : path;
    this.routes.push({ method, path: regex, handler });
  }

  get(path: string | RegExp, handler: RouteHandler): void {
    this.add('GET', path, handler);
  }

  post(path: string | RegExp, handler: RouteHandler): void {
    this.add('POST', path, handler);
  }

  put(path: string | RegExp, handler: RouteHandler): void {
    this.add('PUT', path, handler);
  }

  delete(path: string | RegExp, handler: RouteHandler): void {
    this.add('DELETE', path, handler);
  }

  patch(path: string | RegExp, handler: RouteHandler): void {
    this.add('PATCH', path, handler);
  }

  private pathToRegex(path: string): RegExp {
    // Convert path parameters like /users/:id to regex
    const pattern = path
      .replace(/:[^/]+/g, '([^/]+)') // Replace :param with capture group
      .replace(/\*/g, '.*'); // Replace * with wildcard
    return new RegExp(`^${pattern}$`);
  }

  async handle(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    // Create request context
    const requestId = crypto.randomUUID();
    const context: RequestContext = {
      requestId,
      startTime: Date.now(),
      env,
    };

    const logger = createLogger(env, requestId);

    logger.info('Incoming request', {
      method,
      path,
      user_agent: request.headers.get('user-agent'),
    });

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Find matching route
      for (const route of this.routes) {
        if (route.method === method && route.path.test(path)) {
          logger.debug('Route matched', {
            method: route.method,
            path: route.path.source,
          });

          const response = await route.handler(request, env, ctx, context);
          
          const duration = Date.now() - context.startTime;
          logger.info('Request completed', {
            status: response.status,
            duration_ms: duration,
          });

          return response;
        }
      }

      // No route matched
      logger.warn('Route not found', { method, path });
      throw new AppError('ROUTE_NOT_FOUND', 'Route not found', 404);
    } catch (error) {
      logger.error('Request failed', error);
      
      if (error instanceof AppError) {
        return errorResponse(error, requestId);
      }
      
      return errorResponse(
        new AppError(
          'INTERNAL_ERROR',
          'An unexpected error occurred',
          500
        ),
        requestId
      );
    }
  }
}
