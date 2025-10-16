/**
 * Response Utilities
 * 
 * Standardized response helpers for Cloudflare Workers.
 */

/**
 * CORS headers for API responses
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

/**
 * Get CORS headers with specific origin
 */
export function getCorsHeaders(origin?: string, allowedOrigins?: string[]): Record<string, string> {
  if (!origin || !allowedOrigins || allowedOrigins.includes('*')) {
    return corsHeaders;
  }

  if (allowedOrigins.includes(origin)) {
    return {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  return corsHeaders;
}

/**
 * Standard JSON response
 */
export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...headers,
    },
  });
}

/**
 * Success response
 */
export function successResponse(data: any, status = 200): Response {
  return jsonResponse(
    {
      success: true,
      data,
    },
    status
  );
}

/**
 * Error response
 */
export function errorResponse(
  message: string,
  status = 400,
  additionalData?: Record<string, any>
): Response {
  return jsonResponse(
    {
      success: false,
      error: message,
      ...additionalData,
    },
    status
  );
}

/**
 * Not found response
 */
export function notFoundResponse(resource = 'Resource'): Response {
  return errorResponse(`${resource} not found`, 404);
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): Response {
  return errorResponse(message, 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): Response {
  return errorResponse(message, 403);
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: Record<string, string[]>): Response {
  return jsonResponse(
    {
      success: false,
      error: 'Validation failed',
      errors,
    },
    422
  );
}

/**
 * Rate limit exceeded response
 */
export function rateLimitResponse(retryAfter?: number): Response {
  const headers: Record<string, string> = {};
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  return jsonResponse(
    {
      success: false,
      error: 'Rate limit exceeded',
      retryAfter,
    },
    429,
    headers
  );
}

/**
 * Handle CORS preflight
 */
export function handleCorsPreflightcorsHeaders: Record<string, string> = corsHeaders): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
