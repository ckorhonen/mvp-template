import type { Env } from '../types/env';
import { AuthenticationError, AuthorizationError } from './errors';

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email?: string;
  role?: string;
  iat: number; // Issued at
  exp: number; // Expiration
}

/**
 * Create a JWT token (simplified - use a proper library in production)
 */
export async function createJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = await signHmac(`${encodedHeader}.${encodedPayload}`, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AuthenticationError('Invalid token format');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = await signHmac(`${encodedHeader}.${encodedPayload}`, secret);

  if (signature !== expectedSignature) {
    throw new AuthenticationError('Invalid token signature');
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now) {
    throw new AuthenticationError('Token expired');
  }

  return payload;
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate request and return payload
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<JwtPayload> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthenticationError('Missing authentication token');
  }

  return verifyJwt(token, env.JWT_SECRET);
}

/**
 * Check if user has required role
 */
export function requireRole(payload: JwtPayload, requiredRole: string): void {
  if (payload.role !== requiredRole) {
    throw new AuthorizationError(`Required role: ${requiredRole}`);
  }
}

/**
 * Generate API key
 */
export async function generateApiKey(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper: Base64 URL encoding
 */
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Helper: Base64 URL decoding
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

/**
 * Helper: HMAC signing
 */
async function signHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signature));
  return base64UrlEncode(
    String.fromCharCode.apply(null, signatureArray as any)
  );
}
