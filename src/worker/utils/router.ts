import { RouteHandler, Middleware, WorkerError, Env } from '../types';
import { ResponseBuilder } from './response';

/**
 * Simple but powerful router for Cloudflare Workers
 */

interface Route {
  method: string;
  pattern: URLPattern;
  handler: RouteHandler;
  middlewares: Middleware[];
}

export class Router {
  private routes: Route[] = [];
  private globalMiddlewares: Middleware[] = [];
  private notFoundHandler?: RouteHandler;

  /**
   * Add global middleware
   */
  use(middleware: Middleware): this {
    this.globalMiddlewares.push(middleware);
    return this;
  }

  /**
   * Register a GET route
   */
  get(path: string, handler: RouteHandler, ...middlewares: Middleware[]): this {
    return this.addRoute('GET', path, handler, middlewares);
  }

  /**
   * Register a POST route
   */
  post(path: string, handler: RouteHandler, ...middlewares: Middleware[]): this {
    return this.addRoute('POST', path, handler, middlewares);
  }

  /**
   * Register a PUT route
   */
  put(path: string, handler: RouteHandler, ...middlewares: Middleware[]): this {
    return this.addRoute('PUT', path, handler, middlewares);
  }

  /**
   * Register a DELETE route
   */
  delete(path: string, handler: RouteHandler, ...middlewares: Middleware[]): this {
    return this.addRoute('DELETE', path, handler, middlewares);
  }

  /**
   * Register a PATCH route
   */
  patch(path: string, handler: RouteHandler, ...middlewares: Middleware[]): this {
    return this.addRoute('PATCH', path, handler, middlewares);
  }

  /**
   * Register any HTTP method
   */
  all(path: string, handler: RouteHandler, ...middlewares: Middleware[]): this {
    return this.addRoute('*', path, handler, middlewares);
  }

  /**
   * Set custom 404 handler
   */
  setNotFoundHandler(handler: RouteHandler): this {
    this.notFoundHandler = handler;
    return this;
  }

  /**
   * Add a route with pattern matching
   */
  private addRoute(
    method: string,
    path: string,
    handler: RouteHandler,
    middlewares: Middleware[]
  ): this {
    // Convert path to URLPattern
    const pattern = new URLPattern({ pathname: path });
    
    this.routes.push({
      method,
      pattern,
      handler,
      middlewares,
    });

    return this;
  }

  /**
   * Handle incoming request
   */
  async handle(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return ResponseBuilder.preflight();
      }

      const url = new URL(request.url);

      // Find matching route
      for (const route of this.routes) {
        if (route.method !== '*' && route.method !== request.method) {
          continue;
        }

        const match = route.pattern.exec(url);
        if (!match) {
          continue;
        }

        // Extract path parameters
        const params = match.pathname.groups || {};

        // Build middleware chain
        const middlewares = [
          ...this.globalMiddlewares,
          ...route.middlewares,
        ];

        // Execute middleware chain
        let response = await this.executeMiddlewares(
          request,
          env,
          ctx,
          middlewares,
          () => route.handler(request, env, ctx, params)
        );

        // Apply CORS headers
        return ResponseBuilder.cors(response);
      }

      // No route matched - return 404
      if (this.notFoundHandler) {
        return this.notFoundHandler(request, env, ctx);
      }

      return ResponseBuilder.error(
        new WorkerError('Route not found', 404, 'NOT_FOUND')
      );
    } catch (error) {
      console.error('Router error:', error);
      return ResponseBuilder.error(
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddlewares(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    middlewares: Middleware[],
    finalHandler: () => Promise<Response>
  ): Promise<Response> {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index >= middlewares.length) {
        return await finalHandler();
      }

      const middleware = middlewares[index++];
      return await middleware(request, env, ctx, next);
    };

    return await next();
  }
}
