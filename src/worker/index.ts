/**
 * Cloudflare Workers MVP Template
 * Main entry point with comprehensive service integration
 */

import type { Env } from './types';
import { Router } from './router';
import { errorResponse } from './utils/response';
import { cors } from './middleware/cors';
import { logger } from './middleware/logger';
import { requireAuth, requireApiKey } from './middleware/auth';

// Import route handlers
import { chatCompletion, generateEmbeddings, streamChatCompletion } from './routes/ai';
import { createUser, getUser, updateUser, deleteUser } from './routes/database';
import { uploadFile, downloadFile, deleteFile, listFiles } from './routes/storage';
import { getCacheValue, setCacheValue, deleteCacheValue } from './routes/cache';

/**
 * Create and configure router
 */
function createRouter(): Router {
  const router = new Router();

  // Global middleware
  router.use(cors({
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  }));
  router.use(logger());

  // Health check
  router.get('/health', async () => {
    return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  });

  // AI Gateway routes (require authentication)
  router.post('/api/ai/chat', chatCompletion, [requireAuth()]);
  router.post('/api/ai/embeddings', generateEmbeddings, [requireAuth()]);
  router.post('/api/ai/stream', streamChatCompletion, [requireAuth()]);

  // Database routes
  router.post('/api/users', createUser); // Public - for registration
  router.get('/api/users/:id', getUser, [requireAuth()]);
  router.patch('/api/users/:id', updateUser, [requireAuth()]);
  router.delete('/api/users/:id', deleteUser, [requireAuth()]);

  // Storage routes (require authentication)
  router.post('/api/storage/upload', uploadFile, [requireAuth()]);
  router.get('/api/storage/:key', downloadFile);
  router.delete('/api/storage/:key', deleteFile, [requireAuth()]);
  router.get('/api/storage', listFiles, [requireAuth()]);

  // Cache routes (require API key)
  router.get('/api/cache/:key', getCacheValue, [requireApiKey()]);
  router.post('/api/cache', setCacheValue, [requireApiKey()]);
  router.delete('/api/cache/:key', deleteCacheValue, [requireApiKey()]);

  return router;
}

/**
 * Main fetch handler
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionCtx: ExecutionContext
  ): Promise<Response> {
    try {
      const router = createRouter();
      
      // Create context
      const ctx = {
        request,
        env,
        executionCtx,
        requestId: crypto.randomUUID(),
        startTime: Date.now(),
      };

      return await router.handle(ctx);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal server error',
        500
      );
    }
  },
};
