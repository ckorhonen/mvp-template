/**
 * Simple but powerful router for Cloudflare Workers
 */

import type { Context, Route, RouteHandler, Middleware } from './types';
import { notFoundResponse, methodNotAllowedResponse } from './utils/response';

interface RouteMatch {
  handler: RouteHandler;
  params: Record<string, string>;
  middleware: Middleware[];
}

/**
 * Router class
 */
export class Router {
  private routes: Route[] = [];
  private globalMiddleware: Middleware[] = [];

  /**
   * Add global middleware
   */
  use(middleware: Middleware): void {
    this.globalMiddleware.push(middleware);
  }

  /**
   * Add a route
   */
  addRoute(route: Route): void {
    this.routes.push(route);
  }

  /**
   * GET route
   */
  get(path: string, handler: RouteHandler, middleware: Middleware[] = []): void {
    this.addRoute({ method: 'GET', path, handler, middleware });
  }

  /**
   * POST route
   */
  post(path: string, handler: RouteHandler, middleware: Middleware[] = []): void {
    this.addRoute({ method: 'POST', path, handler, middleware });
  }

  /**
   * PUT route
   */
  put(path: string, handler: RouteHandler, middleware: Middleware[] = []): void {
    this.addRoute({ method: 'PUT', path, handler, middleware });
  }

  /**
   * PATCH route
   */
  patch(path: string, handler: RouteHandler, middleware: Middleware[] = []): void {
    this.addRoute({ method: 'PATCH', path, handler, middleware });
  }

  /**
   * DELETE route
   */
  delete(path: string, handler: RouteHandler, middleware: Middleware[] = []): void {
    this.addRoute({ method: 'DELETE', path, handler, middleware });
  }

  /**
   * Match a request to a route
   */
  private matchRoute(method: string, pathname: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const params = this.matchPath(route.path, pathname);
      if (params !== null) {
        return {
          handler: route.handler,
          params,
          middleware: route.middleware || [],
        };
      }
    }

    return null;
  }

  /**
   * Match a path pattern with parameters
   */
  private matchPath(pattern: string, pathname: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddleware(
    ctx: Context,
    middleware: Middleware[],
    handler: RouteHandler,
    params: Record<string, string>
  ): Promise<Response> {
    let index = 0;

    const next = async (): Promise<Response> => {
      if (index < middleware.length) {
        const mw = middleware[index++];
        return await mw(ctx, next);
      }
      return await handler(ctx, params);
    };

    return await next();
  }

  /**
   * Handle a request
   */
  async handle(ctx: Context): Promise<Response> {
    try {
      const url = new URL(ctx.request.url);
      const match = this.matchRoute(ctx.request.method, url.pathname);

      if (!match) {
        // Check if path exists with different method
        const pathExists = this.routes.some(
          route => this.matchPath(route.path, url.pathname) !== null
        );

        if (pathExists) {
          const allowedMethods = this.routes
            .filter(route => this.matchPath(route.path, url.pathname) !== null)
            .map(route => route.method);
          return methodNotAllowedResponse(allowedMethods);
        }

        return notFoundResponse();
      }

      // Combine global and route-specific middleware
      const allMiddleware = [...this.globalMiddleware, ...match.middleware];

      return await this.executeMiddleware(
        ctx,
        allMiddleware,
        match.handler,
        match.params
      );
    } catch (error) {
      console.error('Router error:', error);
      throw error;
    }
  }
}
