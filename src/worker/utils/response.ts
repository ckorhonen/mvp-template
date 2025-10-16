/**
 * Response utility functions for Cloudflare Workers
 */

import type { ApiResponse, ApiError } from '../types';

/**
 * Create a successful JSON response
 */
export function jsonResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    } as ApiResponse<T>),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
        ...headers,
      },
    }
  );
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: string | ApiError,
  status: number = 400,
  headers: Record<string, string> = {}
): Response {
  const errorData: ApiResponse = {
    success: false,
    error: typeof error === 'string' ? error : error.message,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(errorData), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...headers,
    },
  });
}

/**
 * Get CORS headers
 */
export function corsHeaders(origin: string = '*'): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleOptions(request: Request): Response {
  const origin = request.headers.get('Origin') || '*';
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

/**
 * Create a redirect response
 */
export function redirectResponse(url: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}

/**
 * Create a text response
 */
export function textResponse(
  text: string,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(text, {
    status,
    headers: {
      'Content-Type': 'text/plain',
      ...headers,
    },
  });
}

/**
 * Create an HTML response
 */
export function htmlResponse(
  html: string,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html',
      ...headers,
    },
  });
}
