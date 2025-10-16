/**
 * Authentication Utilities
 * JWT and API key authentication helpers
 */

import { AuthenticationError, AuthorizationError } from './errors';

/**
 * Extract bearer token from Authorization header
 * @param request - Request object
 * @returns Token or null
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Extract API key from header or query parameter
 * @param request - Request object
 * @param headerName - Header name for API key
 * @param queryParam - Query parameter name for API key
 * @returns API key or null
 */
export function extractApiKey(
  request: Request,
  headerName: string = 'X-API-Key',
  queryParam: string = 'api_key'
): string | null {
  // Try header first
  const headerKey = request.headers.get(headerName);
  if (headerKey) return headerKey;

  // Try query parameter
  const url = new URL(request.url);
  return url.searchParams.get(queryParam);
}

/**
 * Verify API key against environment variable or KV store
 * @param apiKey - API key to verify
 * @param env - Environment bindings
 * @returns True if valid
 */
export async function verifyApiKey(
  apiKey: string,
  env: any
): Promise<boolean> {
  // Check against environment variable
  if (env.API_KEY && env.API_KEY === apiKey) {
    return true;
  }

  // Check against KV store if available
  if (env.API_KEYS) {
    const storedKey = await env.API_KEYS.get(`key:${apiKey}`);
    return storedKey !== null;
  }

  return false;
}

/**
 * Simple JWT verification (for Cloudflare Access tokens)
 * Note: For production, use a proper JWT library
 * @param token - JWT token
 * @param secret - Secret key
 * @returns Decoded payload or null
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<any | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return null;
    }

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    // In production, verify signature using Web Crypto API
    // For now, just return the payload
    return payload;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware
 * @param verifyFn - Function to verify credentials
 * @returns Middleware function
 */
export function authMiddleware(
  verifyFn: (request: Request, env: any) => Promise<any>
) {
  return async (
    request: Request,
    env: any,
    next: () => Promise<Response>
  ): Promise<Response> => {
    const user = await verifyFn(request, env);
    
    if (!user) {
      throw new AuthenticationError('Invalid or missing credentials');
    }

    // Attach user to request (in practice, use context)
    (request as any).user = user;

    return next();
  };
}

/**
 * Generate a simple API key
 * @returns Random API key
 */
export function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
