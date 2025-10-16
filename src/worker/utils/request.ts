/**
 * Request Utility Functions
 * Helpers for parsing and validating requests
 */

/**
 * Parse JSON body from request
 */
export async function parseJSON<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Parse URL search params
 */
export function parseSearchParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * Get a single query parameter
 */
export function getQueryParam(
  request: Request,
  key: string,
  defaultValue?: string
): string | undefined {
  const params = parseSearchParams(request);
  return params.get(key) ?? defaultValue;
}

/**
 * Parse pagination parameters
 */
export function parsePaginationParams(request: Request): {
  page: number;
  pageSize: number;
} {
  const params = parseSearchParams(request);
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(params.get('pageSize') || '10', 10))
  );
  return { page, pageSize };
}

/**
 * Extract bearer token from Authorization header
 */
export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }
  return auth.substring(7);
}

/**
 * Validate required headers
 */
export function validateHeaders(
  request: Request,
  requiredHeaders: string[]
): void {
  const missing = requiredHeaders.filter(
    (header) => !request.headers.has(header)
  );
  if (missing.length > 0) {
    throw new Error(`Missing required headers: ${missing.join(', ')}`);
  }
}

/**
 * Check if request is JSON
 */
export function isJSON(request: Request): boolean {
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}

/**
 * Get client IP address
 */
export function getClientIP(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ||
    null
  );
}

/**
 * Get Cloudflare request context
 */
export function getCFContext(request: Request): Record<string, unknown> {
  return {
    ip: request.headers.get('CF-Connecting-IP'),
    country: request.headers.get('CF-IPCountry'),
    colo: request.headers.get('CF-Ray')?.split('-')[1],
    ray: request.headers.get('CF-Ray'),
  };
}

/**
 * Validate request method
 */
export function validateMethod(
  request: Request,
  allowedMethods: string[]
): void {
  if (!allowedMethods.includes(request.method)) {
    throw new Error(
      `Method ${request.method} not allowed. Allowed: ${allowedMethods.join(', ')}`
    );
  }
}
