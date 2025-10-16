/**
 * Cloudflare Workers MVP Template
 * Main entry point with routing and middleware
 */

import { Env } from './types';
import { corsPreflightResponse, ErrorResponses } from './utils/response';
import { createLogger } from './utils/logger';
import { createRateLimiter, getRequestIdentifier, addRateLimitHeaders } from './utils/ratelimit';
import { generateId } from './utils/auth';

// Import route handlers
import { handleChatCompletion, handleEmbedding, handleStreamingChat } from './routes/ai';
import {
  handleListItems,
  handleGetItem,
  handleCreateItem,
  handleUpdateItem,
  handleDeleteItem,
} from './routes/db';
import { handleGetCache, handleSetCache, handleDeleteCache, handleListCache } from './routes/kv';
import {
  handleGetFile,
  handleUploadFile,
  handleDeleteFile,
  handleListFiles,
  handleHeadFile,
} from './routes/r2';
import { handleHealthCheck } from './routes/health';

/**
 * Router type definition
 */
type RouteHandler = (request: Request, env: Env, params: any, requestId?: string) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
}

/**
 * Define all routes
 */
const routes: Route[] = [
  // Health check
  { method: 'GET', pattern: /^\/api\/health$/, handler: handleHealthCheck },

  // AI routes
  { method: 'POST', pattern: /^\/api\/ai\/chat$/, handler: handleChatCompletion },
  { method: 'POST', pattern: /^\/api\/ai\/embed$/, handler: handleEmbedding },
  { method: 'POST', pattern: /^\/api\/ai\/stream$/, handler: handleStreamingChat },

  // Database routes
  { method: 'GET', pattern: /^\/api\/db\/items$/, handler: handleListItems },
  { method: 'GET', pattern: /^\/api\/db\/items\/(\d+)$/, handler: (req, env, match, reqId) => handleGetItem(req, env, match[1], reqId) },
  { method: 'POST', pattern: /^\/api\/db\/items$/, handler: handleCreateItem },
  { method: 'PUT', pattern: /^\/api\/db\/items\/(\d+)$/, handler: (req, env, match, reqId) => handleUpdateItem(req, env, match[1], reqId) },
  { method: 'DELETE', pattern: /^\/api\/db\/items\/(\d+)$/, handler: (req, env, match, reqId) => handleDeleteItem(req, env, match[1], reqId) },

  // KV cache routes
  { method: 'GET', pattern: /^\/api\/kv\/cache$/, handler: handleListCache },
  { method: 'GET', pattern: /^\/api\/kv\/cache\/([^/]+)$/, handler: (req, env, match, reqId) => handleGetCache(req, env, match[1], reqId) },
  { method: 'PUT', pattern: /^\/api\/kv\/cache\/([^/]+)$/, handler: (req, env, match, reqId) => handleSetCache(req, env, match[1], reqId) },
  { method: 'DELETE', pattern: /^\/api\/kv\/cache\/([^/]+)$/, handler: (req, env, match, reqId) => handleDeleteCache(req, env, match[1], reqId) },

  // R2 storage routes
  { method: 'GET', pattern: /^\/api\/r2\/files$/, handler: handleListFiles },
  { method: 'GET', pattern: /^\/api\/r2\/files\/(.+)$/, handler: (req, env, match, reqId) => handleGetFile(req, env, match[1], reqId) },
  { method: 'PUT', pattern: /^\/api\/r2\/files\/(.+)$/, handler: (req, env, match, reqId) => handleUploadFile(req, env, match[1], reqId) },
  { method: 'DELETE', pattern: /^\/api\/r2\/files\/(.+)$/, handler: (req, env, match, reqId) => handleDeleteFile(req, env, match[1], reqId) },
  { method: 'HEAD', pattern: /^\/api\/r2\/files\/(.+)$/, handler: (req, env, match, reqId) => handleHeadFile(req, env, match[1], reqId) },
];

/**
 * Find matching route
 */
function findRoute(method: string, path: string): { handler: RouteHandler; match: RegExpMatchArray } | null {
  for (const route of routes) {
    if (route.method === method) {
      const match = path.match(route.pattern);
      if (match) {
        return { handler: route.handler, match };
      }
    }
  }
  return null;
}

/**
 * Main fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const requestId = generateId();
    const logger = createLogger(env, 'worker');
    const origin = request.headers.get('Origin') || undefined;

    // Log incoming request
    logger.info('Incoming request', {
      method,
      path,
      requestId,
      origin,
    });

    try {
      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return corsPreflightResponse(origin, env.CORS_ALLOWED_ORIGINS);
      }

      // Rate limiting (skip for health check)
      if (path !== '/api/health') {
        const rateLimiter = createRateLimiter(env.CACHE, 100, 60000);
        const identifier = getRequestIdentifier(request);
        const rateLimit = await rateLimiter.checkLimit(identifier);

        if (rateLimit.exceeded) {
          const response = ErrorResponses.rateLimitExceeded(
            'Rate limit exceeded. Please try again later.',
            requestId,
            origin,
            env.CORS_ALLOWED_ORIGINS
          );
          addRateLimitHeaders(response.headers, rateLimit);
          return response;
        }

        // Add rate limit headers to response (will be added later)
        ctx.passThroughOnException();
      }

      // Find matching route
      const route = findRoute(method, path);

      if (!route) {
        // Default route - return API documentation
        if (path === '/' || path === '/api') {
          return new Response(
            JSON.stringify({
              name: 'Cloudflare Workers MVP Template',
              version: '1.0.0',
              endpoints: {
                health: 'GET /api/health',
                ai: {
                  chat: 'POST /api/ai/chat',
                  embed: 'POST /api/ai/embed',
                  stream: 'POST /api/ai/stream',
                },
                database: {
                  list: 'GET /api/db/items',
                  get: 'GET /api/db/items/:id',
                  create: 'POST /api/db/items',
                  update: 'PUT /api/db/items/:id',
                  delete: 'DELETE /api/db/items/:id',
                },
                cache: {
                  list: 'GET /api/kv/cache',
                  get: 'GET /api/kv/cache/:key',
                  set: 'PUT /api/kv/cache/:key',
                  delete: 'DELETE /api/kv/cache/:key',
                },
                storage: {
                  list: 'GET /api/r2/files',
                  get: 'GET /api/r2/files/:key',
                  upload: 'PUT /api/r2/files/:key',
                  delete: 'DELETE /api/r2/files/:key',
                  head: 'HEAD /api/r2/files/:key',
                },
              },
              documentation: 'See README.md for full API documentation',
            }, null, 2),
            {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin || '*',
              },
            }
          );
        }

        return ErrorResponses.notFound(
          'Endpoint not found',
          requestId,
          origin,
          env.CORS_ALLOWED_ORIGINS
        );
      }

      // Execute route handler
      const response = await route.handler(request, env, route.match, requestId);

      // Add request ID header
      response.headers.set('X-Request-ID', requestId);

      logger.info('Request completed', {
        requestId,
        status: response.status,
      });

      return response;
    } catch (error: any) {
      logger.error('Unhandled error', error, { requestId });

      return ErrorResponses.internalError(
        'An unexpected error occurred',
        env.ENVIRONMENT === 'development' ? error.message : undefined,
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }
  },
};
