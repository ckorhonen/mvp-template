/**
 * Cloudflare Workers Entry Point
 * Comprehensive MVP template with all Cloudflare services integrated
 */

import { handleAIRoutes } from './routes/ai';
import { handleDatabaseRoutes } from './routes/database';
import { handleKVRoutes } from './routes/kv';
import { handleR2Routes } from './routes/r2';
import { handleCORS, errorResponse, jsonResponse } from './lib/utils';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    try {
      // Health check
      if (path === '/health' || path === '/') {
        return jsonResponse({
          status: 'healthy',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          environment: env.ENVIRONMENT || 'development',
        });
      }

      // AI Gateway routes
      if (path.startsWith('/api/ai')) {
        return await handleAIRoutes(request, env);
      }

      // Database routes
      if (path.startsWith('/api/db')) {
        return await handleDatabaseRoutes(request, env);
      }

      // KV routes
      if (path.startsWith('/api/kv')) {
        return await handleKVRoutes(request, env);
      }

      // R2 routes
      if (path.startsWith('/api/r2')) {
        return await handleR2Routes(request, env);
      }

      // API documentation
      if (path === '/api' || path === '/api/docs') {
        return jsonResponse({
          name: 'Cloudflare Workers MVP API',
          version: '1.0.0',
          description: 'Comprehensive API showcasing all Cloudflare services',
          endpoints: {
            ai: {
              'POST /api/ai/chat': 'Chat completion with AI Gateway',
              'POST /api/ai/generate': 'Simple text generation',
              'POST /api/ai/embeddings': 'Generate embeddings',
              'POST /api/ai/stream': 'Streaming chat completion',
            },
            database: {
              'GET /api/db/users': 'List users with pagination',
              'GET /api/db/users/:id': 'Get user by ID',
              'POST /api/db/users': 'Create new user',
              'PUT /api/db/users/:id': 'Update user',
              'DELETE /api/db/users/:id': 'Delete user',
              'GET /api/db/stats': 'Database statistics',
            },
            kv: {
              'GET /api/kv/cache/:key': 'Get cached value',
              'POST /api/kv/cache': 'Set cached value',
              'DELETE /api/kv/cache/:key': 'Delete cached value',
              'POST /api/kv/rate-limit': 'Check rate limit',
              'GET /api/kv/list': 'List KV keys',
            },
            r2: {
              'GET /api/r2/assets/:key': 'Get asset from R2',
              'POST /api/r2/assets': 'Upload asset to R2',
              'DELETE /api/r2/assets/:key': 'Delete asset from R2',
              'GET /api/r2/list': 'List R2 objects',
              'POST /api/r2/uploads': 'Upload file to uploads bucket',
            },
          },
        });
      }

      // 404 - Not found
      return errorResponse('Not found', 404);
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse(
        'Internal server error',
        500,
        error instanceof Error ? error.message : undefined
      );
    }
  },
};
