/**
 * Simple Router Utility
 * Lightweight routing for Cloudflare Workers
 */

export class Router {
  private routes: Map<string, Map<string, RouteHandler>> = new Map();

  /**
   * Add a GET route
   */
  get(path: string, handler: RouteHandler): void {
    this.addRoute('GET', path, handler);
  }

  /**
   * Add a POST route
   */
  post(path: string, handler: RouteHandler): void {
    this.addRoute('POST', path, handler);
  }

  /**
   * Add a PUT route
   */
  put(path: string, handler: RouteHandler): void {
    this.addRoute('PUT', path, handler);
  }

  /**
   * Add a DELETE route
   */
  delete(path: string, handler: RouteHandler): void {
    this.addRoute('DELETE', path, handler);
  }

  /**
   * Add a PATCH route
   */
  patch(path: string, handler: RouteHandler): void {
    this.addRoute('PATCH', path, handler);
  }

  /**
   * Add a route for any method
   */
  private addRoute(method: string, path: string, handler: RouteHandler): void {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(path, handler);
  }

  /**
   * Route an incoming request
   */
  async route(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) return null;

    // Try exact match first
    const exactHandler = methodRoutes.get(pathname);
    if (exactHandler) {
      return await exactHandler({});
    }

    // Try pattern matching
    for (const [pattern, handler] of methodRoutes.entries()) {
      const params = this.matchPattern(pattern, pathname);
      if (params) {
        return await handler(params);
      }
    }

    return null;
  }

  /**
   * Match a URL pattern and extract parameters
   */
  private matchPattern(pattern: string, pathname: string): Record<string, string> | null {
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        // Parameter
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
      } else if (patternPart !== pathPart) {
        // No match
        return null;
      }
    }

    return params;
  }
}

export type RouteHandler = (params: Record<string, string>) => Promise<Response>;
