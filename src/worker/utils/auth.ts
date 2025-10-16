/**
 * Authentication and authorization utilities
 */

import { Env, User } from '../types';

/**
 * Simple JWT-like token generation (for demo purposes)
 * In production, use a proper JWT library
 */
export async function generateToken(payload: any, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = await sign(`${header}.${body}`, secret);
  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a token
 */
export async function verifyToken(token: string, secret: string): Promise<any> {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = await sign(`${header}.${body}`, secret);
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    return JSON.parse(atob(body));
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Create a signature using Web Crypto API
 */
async function sign(data: string, secret: string): Promise<string> {
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
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Hash a password using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Authenticate request and extract user
 */
export async function authenticateRequest(request: Request, env: Env): Promise<User | null> {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token, env.JWT_SECRET);
    // In a real app, you'd fetch the user from the database
    return payload.user as User;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, requiredRole: string | string[]): boolean {
  if (!user) return false;
  
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.includes(user.role);
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}
