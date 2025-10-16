/**
 * Authentication and authorization utilities
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { AuthenticationError, AuthorizationError } from './errors';
import { extractBearerToken } from './validation';

interface Session {
  userId: string;
  email?: string;
  role?: string;
  createdAt: number;
  expiresAt: number;
  [key: string]: unknown;
}

/**
 * Session manager using KV storage
 */
export class SessionManager {
  constructor(
    private kv: KVNamespace,
    private ttlSeconds: number = 86400 // 24 hours default
  ) {}

  /**
   * Create a new session
   */
  async create(userId: string, data: Partial<Session> = {}): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: Session = {
      userId,
      ...data,
      createdAt: now,
      expiresAt: now + this.ttlSeconds * 1000,
    };

    await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: this.ttlSeconds,
    });

    return sessionId;
  }

  /**
   * Get session by ID
   */
  async get(sessionId: string): Promise<Session | null> {
    const data = await this.kv.get(`session:${sessionId}`);
    if (!data) {
      return null;
    }

    const session = JSON.parse(data) as Session;

    // Check if expired
    if (Date.now() >= session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<void> {
    await this.kv.delete(`session:${sessionId}`);
  }

  /**
   * Refresh session TTL
   */
  async refresh(sessionId: string): Promise<void> {
    const session = await this.get(sessionId);
    if (!session) {
      throw new AuthenticationError('Session not found');
    }

    session.expiresAt = Date.now() + this.ttlSeconds * 1000;
    await this.kv.put(`session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: this.ttlSeconds,
    });
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Extract and validate session from request
 */
export async function getSession(
  request: Request,
  sessionManager: SessionManager
): Promise<Session> {
  const token = extractBearerToken(request);
  if (!token) {
    throw new AuthenticationError('No authentication token provided');
  }

  const session = await sessionManager.get(token);
  if (!session) {
    throw new AuthenticationError('Invalid or expired session');
  }

  return session;
}

/**
 * Check if session has required role
 */
export function requireRole(session: Session, ...roles: string[]): void {
  if (!session.role || !roles.includes(session.role)) {
    throw new AuthorizationError(
      `Required role: ${roles.join(' or ')}`
    );
  }
}

/**
 * Simple API key validation
 */
export function validateApiKey(request: Request, validKeys: string[]): void {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    throw new AuthenticationError('API key required');
  }
  
  if (!validKeys.includes(apiKey)) {
    throw new AuthenticationError('Invalid API key');
  }
}

/**
 * Generate a secure API key
 */
export function generateApiKey(prefix: string = 'sk'): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${key}`;
}
