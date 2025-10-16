/**
 * CORS Utilities
 * 
 * Helper functions for handling Cross-Origin Resource Sharing
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
  maxAge: 86400,
  credentials: false,
};

/**
 * Get CORS headers for a response
 */
export function getCorsHeaders(
  request: Request,
  options: CorsOptions = {}
): HeadersInit {
  const opts = { ...DEFAULT_CORS_OPTIONS, ...options };
  const origin = request.headers.get('Origin');

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': opts.allowedMethods!.join(', '),
    'Access-Control-Allow-Headers': opts.allowedHeaders!.join(', '),
    'Access-Control-Max-Age': opts.maxAge!.toString(),
  };

  // Handle origin
  if (opts.allowedOrigins!.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && opts.allowedOrigins!.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  // Handle credentials
  if (opts.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  // Handle exposed headers
  if (opts.exposedHeaders && opts.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = opts.exposedHeaders.join(', ');
  }

  return headers;
}

/**
 * Create a CORS preflight response
 */
export function createCorsPreflightResponse(
  request: Request,
  options: CorsOptions = {}
): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, options),
  });
}

/**
 * Add CORS headers to an existing response
 */
export function addCorsHeaders(
  response: Response,
  request: Request,
  options: CorsOptions = {}
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
 * Check if a request is a CORS preflight request
 */
export function isCorsPreflightRequest(request: Request): boolean {
  return (
    request.method === 'OPTIONS' &&
    request.headers.has('Origin') &&
    request.headers.has('Access-Control-Request-Method')
  );
}
