/**
 * CORS Utilities for Cloudflare Workers
 * Handles Cross-Origin Resource Sharing headers and preflight requests
 */

export interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [],
  maxAge: 86400, // 24 hours
  credentials: false,
};

/**
 * Add CORS headers to a Response object
 * @param response - The response to add headers to
 * @param options - CORS configuration options
 * @param request - Optional request object to check origin
 * @returns Response with CORS headers
 */
export function addCorsHeaders(
  response: Response,
  options: CorsOptions = {},
  request?: Request
): Response {
  const opts = { ...DEFAULT_CORS_OPTIONS, ...options };
  const headers = new Headers(response.headers);

  // Determine allowed origin
  let allowedOrigin = '*';
  if (request && opts.allowedOrigins && opts.allowedOrigins.length > 0) {
    const origin = request.headers.get('Origin');
    if (origin && (opts.allowedOrigins.includes(origin) || opts.allowedOrigins.includes('*'))) {
      allowedOrigin = origin;
    } else if (!opts.allowedOrigins.includes('*')) {
      // If origin is not allowed and wildcard is not set, use first allowed origin
      allowedOrigin = opts.allowedOrigins[0];
    }
  }

  headers.set('Access-Control-Allow-Origin', allowedOrigin);

  if (opts.allowedMethods && opts.allowedMethods.length > 0) {
    headers.set('Access-Control-Allow-Methods', opts.allowedMethods.join(', '));
  }

  if (opts.allowedHeaders && opts.allowedHeaders.length > 0) {
    headers.set('Access-Control-Allow-Headers', opts.allowedHeaders.join(', '));
  }

  if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
    headers.set('Access-Control-Expose-Headers', opts.exposedHeaders.join(', '));
  }

  if (opts.maxAge) {
    headers.set('Access-Control-Max-Age', opts.maxAge.toString());
  }

  if (opts.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Handle CORS preflight OPTIONS request
 * @param request - The OPTIONS request
 * @param options - CORS configuration options
 * @returns Response to preflight request
 */
export function handleCorsPreflightRequest(
  request: Request,
  options: CorsOptions = {}
): Response {
  const response = new Response(null, { status: 204 });
  return addCorsHeaders(response, options, request);
}

/**
 * Middleware to wrap responses with CORS headers
 * @param options - CORS configuration options
 * @returns Middleware function
 */
export function corsMiddleware(options: CorsOptions = {}) {
  return async (
    request: Request,
    next: () => Promise<Response>
  ): Promise<Response> => {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request, options);
    }

    // Process request and add CORS headers to response
    const response = await next();
    return addCorsHeaders(response, options, request);
  };
}
