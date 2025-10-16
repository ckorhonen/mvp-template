/**
 * Authentication and authorization utilities
 */

import { errorResponse } from './response';

/**
 * Extract Bearer token from Authorization header
 */
export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify API key
 */
export function verifyApiKey(request: Request, validApiKey: string): boolean {
  const apiKey = request.headers.get('X-API-Key');
  return apiKey === validApiKey;
}

/**
 * Create authentication middleware
 */
export function requireAuth(
  request: Request,
  apiKey: string
): Response | null {
  const token = getBearerToken(request);
  const hasValidApiKey = verifyApiKey(request, apiKey);

  if (!token && !hasValidApiKey) {
    return errorResponse('Authentication required', 401);
  }

  return null;
}

/**
 * Generate a simple API key (for development purposes)
 * In production, use proper key management
 */
export function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/**
 * Hash a password using SHA-256 (basic implementation)
 * In production, use bcrypt or Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
