/**
 * Cloudflare Workers MVP Template
 * Main entry point with comprehensive routing for all services
 */

import type { Env } from './types/env';
import { handleError } from './utils/errors';
import { corsHeaders, handleCorsPreflightRequest } from './utils/response';
import { createLogger } from './utils/logger';

// Import route handlers
import { handleChatCompletion, handleEmbeddings, handleAIAnalytics } from './routes/ai';
import { listUsers, getUser, createUser, updateUser, deleteUser } from './routes/users';
import { getCacheValue, setCacheValue, deleteCacheValue, listCacheKeys } from './routes/cache';
import {
  getFile,
  uploadFile,
  deleteFile,
  listFiles,
  getFileMetadata,
} from './routes/files';

/**
 * Main fetch handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const logger = createLogger(request);
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;

    logger.info('Incoming request', {
      method,
      pathname,
      origin: request.headers.get('origin'),
    });

    try {
      // Handle CORS preflight requests
      if (method === 'OPTIONS') {
        const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*'];
        return handleCorsPreflightRequest(allowedOrigins);
      }

      let response: Response;

      // Route handling
      // AI Gateway Routes
      if (pathname === '/api/ai/chat' && method === 'POST') {
        response = await handleChatCompletion(request, env);
      } else if (pathname === '/api/ai/embeddings' && method === 'POST') {
        response = await handleEmbeddings(request, env);
      } else if (pathname === '/api/ai/analytics' && method === 'GET') {
        response = await handleAIAnalytics(request, env);
      }
      // User Routes (D1 Database)
      else if (pathname === '/api/users' && method === 'GET') {
        response = await listUsers(request, env);
      } else if (pathname === '/api/users' && method === 'POST') {
        response = await createUser(request, env);
      } else if (pathname.match(/^\/api\/users\/[^/]+$/) && method === 'GET') {
        const userId = pathname.split('/').pop()!;
        response = await getUser(request, env, userId);
      } else if (pathname.match(/^\/api\/users\/[^/]+$/) && method === 'PUT') {
        const userId = pathname.split('/').pop()!;
        response = await updateUser(request, env, userId);
      } else if (pathname.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
        const userId = pathname.split('/').pop()!;
        response = await deleteUser(request, env, userId);
      }
      // Cache Routes (KV)
      else if (pathname === '/api/cache' && method === 'POST') {
        response = await setCacheValue(request, env);
      } else if (pathname === '/api/cache' && method === 'GET') {
        response = await listCacheKeys(request, env);
      } else if (pathname.match(/^\/api\/cache\/[^/]+$/) && method === 'GET') {
        const key = pathname.split('/').pop()!;
        response = await getCacheValue(request, env, decodeURIComponent(key));
      } else if (pathname.match(/^\/api\/cache\/[^/]+$/) && method === 'DELETE') {
        const key = pathname.split('/').pop()!;
        response = await deleteCacheValue(request, env, decodeURIComponent(key));
      }
      // File Routes (R2)
      else if (pathname === '/api/files' && method === 'POST') {
        response = await uploadFile(request, env);
      } else if (pathname === '/api/files' && method === 'GET') {
        response = await listFiles(request, env);
      } else if (pathname.match(/^\/api\/files\/[^/]+$/) && method === 'GET') {
        const key = pathname.split('/').pop()!;
        response = await getFile(request, env, decodeURIComponent(key));
      } else if (pathname.match(/^\/api\/files\/[^/]+\/metadata$/) && method === 'GET') {
        const key = pathname.split('/')[3];
        response = await getFileMetadata(request, env, decodeURIComponent(key));
      } else if (pathname.match(/^\/api\/files\/[^/]+$/) && method === 'DELETE') {
        const key = pathname.split('/').pop()!;
        response = await deleteFile(request, env, decodeURIComponent(key));
      }
      // Health check
      else if (pathname === '/health' || pathname === '/api/health') {
        response = new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: env.ENVIRONMENT || 'development',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      // API documentation
      else if (pathname === '/' || pathname === '/api') {
        response = new Response(
          JSON.stringify({
            name: 'Cloudflare Workers MVP Template',
            version: '1.0.0',
            documentation: 'https://github.com/ckorhonen/mvp-template',
            endpoints: {
              health: '/health',
              ai: {
                chat: 'POST /api/ai/chat',
                embeddings: 'POST /api/ai/embeddings',
                analytics: 'GET /api/ai/analytics',
              },
              users: {
                list: 'GET /api/users',
                create: 'POST /api/users',
                get: 'GET /api/users/:id',
                update: 'PUT /api/users/:id',
                delete: 'DELETE /api/users/:id',
              },
              cache: {
                list: 'GET /api/cache',
                set: 'POST /api/cache',
                get: 'GET /api/cache/:key',
                delete: 'DELETE /api/cache/:key',
              },
              files: {
                list: 'GET /api/files',
                upload: 'POST /api/files',
                get: 'GET /api/files/:key',
                metadata: 'GET /api/files/:key/metadata',
                delete: 'DELETE /api/files/:key',
              },
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      // 404 Not Found
      else {
        response = new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Endpoint not found',
            },
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Add CORS headers to response
      const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*'];
      const finalResponse = corsHeaders(response, allowedOrigins);

      logger.info('Request completed', {
        status: finalResponse.status,
      });

      return finalResponse;
    } catch (error) {
      logger.error('Unhandled error', error);
      const errorResponse = handleError(error);
      
      // Add CORS headers to error response
      const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*'];
      return corsHeaders(errorResponse, allowedOrigins);
    }
  },
};
