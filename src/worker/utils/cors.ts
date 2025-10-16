/**
 * CORS Utilities
 * 
 * Helper functions for handling Cross-Origin Resource Sharing (CORS)
 */

export interface CORSOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAge?: number;
  credentials?: boolean;
}

const DEFAULT_CORS_OPTIONS: Required<CORSOptions> = {
  allowedOrigins: ['*'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [],
  maxAge: 86400, // 24 hours
  credentials: true,
};

/**
 * Check if an origin is allowed based on configuration
 */
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Allow all origins if wildcard is present
  if (allowedOrigins.includes('*')) {
    return true;
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check pattern match (e.g., *.example.com)
  return allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return false;
  });
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(
  request: Request,
  options: CORSOptions = {},
): Record<string, string> {
  const opts = { ...DEFAULT_CORS_OPTIONS, ...options };
  const origin = request.headers.get('Origin') || '';
  const headers: Record<string, string> = {};

  // Determine allowed origin
  if (isOriginAllowed(origin, opts.allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] =
      opts.allowedOrigins.includes('*') && !opts.credentials ? '*' : origin;
  } else if (opts.allowedOrigins.length > 0 && !opts.allowedOrigins.includes('*')) {
    headers['Access-Control-Allow-Origin'] = opts.allowedOrigins[0];
  }

  // Set credentials header
  if (opts.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Set allowed methods
  if (opts.allowedMethods.length > 0) {
    headers['Access-Control-Allow-Methods'] = opts.allowedMethods.join(', ');
  }

  // Set allowed headers
  if (opts.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = opts.allowedHeaders.join(', ');
  }

  // Set exposed headers
  if (opts.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = opts.exposedHeaders.join(', ');
  }

  // Set max age for preflight cache
  if (opts.maxAge) {
    headers['Access-Control-Max-Age'] = opts.maxAge.toString();
  }

  return headers;
}

/**
 * Handle CORS preflight OPTIONS request
 */
export function handleCorsPreFlight(
  request: Request,
  options: CORSOptions = {},
): Response {
  const headers = getCorsHeaders(request, options);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(
  response: Response,
  request: Request,
  options: CORSOptions = {},
): Response {
  const corsHeaders = getCorsHeaders(request, options);
  const newHeaders = new Headers(response.headers);

  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * CORS middleware wrapper
 */
export function withCors(
  handler: (request: Request) => Promise<Response> | Response,
  options: CORSOptions = {},
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    // Handle preflight request
    if (request.method === 'OPTIONS') {
      return handleCorsPreFlight(request, options);
    }

    // Handle actual request
    const response = await handler(request);
    return addCorsHeaders(response, request, options);
  };
}
