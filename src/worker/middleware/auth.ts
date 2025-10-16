/**
 * Authentication middleware
 */

import type { Context, Middleware } from '../types';
import { unauthorizedResponse } from '../utils/response';
import { createDatabase } from '../services/database';

/**
 * JWT payload structure
 */
interface JwtPayload {
  userId: string;
  exp: number;
  iat: number;
}

/**
 * Simple JWT verification (for production, use a proper JWT library)
 */
async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    
    if (!headerB64 || !payloadB64 || !signatureB64) {
      return null;
    }

    // Verify signature
    const data = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(data)
    );

    if (!valid) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    ) as JwtPayload;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Authentication middleware - requires valid JWT
 */
export function requireAuth(): Middleware {
  return async (ctx: Context, next) => {
    const authHeader = ctx.request.headers.get('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return unauthorizedResponse('Missing or invalid authorization token');
    }

    const payload = await verifyJwt(token, ctx.env.JWT_SECRET);
    
    if (!payload) {
      return unauthorizedResponse('Invalid or expired token');
    }

    // Fetch user from database
    const db = createDatabase(ctx.env);
    const user = await db.getUserById(payload.userId);

    if (!user) {
      return unauthorizedResponse('User not found');
    }

    // Attach user to context
    ctx.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return await next();
  };
}

/**
 * API Key authentication middleware
 */
export function requireApiKey(): Middleware {
  return async (ctx: Context, next) => {
    const apiKey = ctx.request.headers.get('X-API-Key');

    if (!apiKey) {
      return unauthorizedResponse('Missing API key');
    }

    // Hash the API key for lookup
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Look up API key in database
    const db = createDatabase(ctx.env);
    const apiKeyRecord = await db.getApiKeyByHash(keyHash);

    if (!apiKeyRecord) {
      return unauthorizedResponse('Invalid API key');
    }

    // Update last used timestamp
    await db.updateApiKeyLastUsed(apiKeyRecord.id);

    // Fetch user
    const user = await db.getUserById(apiKeyRecord.user_id);
    
    if (!user) {
      return unauthorizedResponse('User not found');
    }

    // Attach user to context
    ctx.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };

    return await next();
  };
}
