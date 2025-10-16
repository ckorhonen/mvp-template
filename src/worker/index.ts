/**
 * Cloudflare Workers MVP Template
 * Main worker entry point with comprehensive routing
 */

import type { Env } from './types';
import { corsResponse, errorResponses, errorResponse } from './utils/response';
import { createLogger, generateRequestId } from './utils/logger';
import { toApiError } from './utils/errors';
import { RateLimiter, getRateLimitKey, rateLimitConfigs } from './utils/rate-limit';

// Route handlers
import {
  handleChatCompletion,
  handleSimpleCompletion,
  handleListModels,
} from './routes/ai';
import {
  handleCreateUser,
  handleListUsers,
  handleGetUser,
  handleUpdateUser,
  handleDeleteUser,
} from './routes/db';
import {
  handleSetKV,
  handleGetKV,
  handleDeleteKV,
  handleListKeys,
} from './routes/kv';
import {
  handleUpload,
  handleDownload,
  handleGetMetadata,
  handleDeleteFile,
  handleListFiles,
  handleCreateMultipartUpload,
} from './routes/r2';
import {
  handleHealthCheck,
  handleDetailedHealthCheck,
  handleReadinessCheck,
  handleLivenessCheck,
} from './routes/health';

/**
 * Router utility to match paths
 */
function matchPath(pathname: string, pattern: string): { match: boolean; params: Record<string, string> } {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');

  if (patternParts.length !== pathParts.length) {
    return { match: false, params: {} };
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      const paramName = patternParts[i].substring(1);
      params[paramName] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return { match: false, params: {} };
    }
  }

  return { match: true, params };
}

/**
 * Main request handler
 */
async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const requestId = generateRequestId();
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;

  // Create logger with request context
  const logger = createLogger(env, {
    requestId,
    path: pathname,
    method,
  });

  logger.info('Incoming request');

  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return corsResponse();
    }

    // Rate limiting (optional)
    if (env.FEATURE_RATE_LIMITING_ENABLED === 'true') {
      const rateLimiter = new RateLimiter(env.CACHE);
      const rateLimitKey = getRateLimitKey(request);
      await rateLimiter.enforce(rateLimitKey, rateLimitConfigs.perMinute);
    }

    // Health check routes (no API prefix)
    if (pathname === '/health') {
      return await handleHealthCheck();
    }
    if (pathname === '/health/detailed') {
      return await handleDetailedHealthCheck(env);
    }
    if (pathname === '/health/ready') {
      return await handleReadinessCheck();
    }
    if (pathname === '/health/live') {
      return await handleLivenessCheck();
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      // AI Gateway routes
      if (pathname === '/api/ai/chat' && method === 'POST') {
        return await handleChatCompletion(request, env);
      }
      if (pathname === '/api/ai/complete' && method === 'POST') {
        return await handleSimpleCompletion(request, env);
      }
      if (pathname === '/api/ai/models' && method === 'GET') {
        return await handleListModels();
      }

      // D1 Database routes
      if (pathname === '/api/db/users' && method === 'POST') {
        return await handleCreateUser(request, env);
      }
      if (pathname === '/api/db/users' && method === 'GET') {
        return await handleListUsers(request, env);
      }

      const userMatch = matchPath(pathname, '/api/db/users/:id');
      if (userMatch.match) {
        const userId = userMatch.params.id;
        if (method === 'GET') {
          return await handleGetUser(userId, env);
        }
        if (method === 'PUT') {
          return await handleUpdateUser(userId, request, env);
        }
        if (method === 'DELETE') {
          return await handleDeleteUser(userId, env);
        }
      }

      // KV routes
      if (pathname === '/api/kv' && method === 'POST') {
        return await handleSetKV(request, env);
      }
      if (pathname === '/api/kv' && method === 'GET') {
        return await handleListKeys(request, env);
      }

      const kvMatch = matchPath(pathname, '/api/kv/:key');
      if (kvMatch.match) {
        const key = kvMatch.params.key;
        if (method === 'GET') {
          return await handleGetKV(key, env);
        }
        if (method === 'DELETE') {
          return await handleDeleteKV(key, env);
        }
      }

      // R2 routes
      if (pathname === '/api/r2/upload' && method === 'POST') {
        return await handleUpload(request, env);
      }
      if (pathname === '/api/r2' && method === 'GET') {
        return await handleListFiles(request, env);
      }
      if (pathname === '/api/r2/multipart/create' && method === 'POST') {
        return await handleCreateMultipartUpload(request, env);
      }

      const r2Match = matchPath(pathname, '/api/r2/:key');
      if (r2Match.match) {
        const key = decodeURIComponent(r2Match.params.key);
        if (method === 'GET') {
          return await handleDownload(key, env);
        }
        if (method === 'HEAD') {
          return await handleGetMetadata(key, env);
        }
        if (method === 'DELETE') {
          return await handleDeleteFile(key, env);
        }
      }
    }

    // Route not found
    logger.warn('Route not found');
    return errorResponses.notFound(`Route ${method} ${pathname} not found`);
  } catch (error) {
    logger.error('Request handler error', error);
    const apiError = toApiError(error);
    return errorResponse(
      apiError.message,
      apiError.statusCode,
      apiError.code,
      apiError.details
    );
  }
}

/**
 * Worker export with fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};
