/**
 * Cloudflare Workers MVP Template
 * Main entry point with comprehensive routing and middleware
 */

import { Env } from './types';
import { Router } from './utils/router';
import { ResponseBuilder } from './utils/response';
import { loggingMiddleware } from './middleware/logging';
import { rateLimitMiddleware } from './middleware/ratelimit';
import { authMiddleware } from './middleware/auth';

// Import route handlers
import { chatHandler, embeddingsHandler, chatStreamHandler } from './routes/ai';
import { 
  listUsersHandler, 
  getUserHandler, 
  createUserHandler, 
  updateUserHandler, 
  deleteUserHandler 
} from './routes/database';
import { 
  uploadHandler, 
  downloadHandler, 
  deleteFileHandler, 
  listFilesHandler 
} from './routes/storage';
import { 
  getCacheHandler, 
  setCacheHandler, 
  deleteCacheHandler 
} from './routes/cache';

/**
 * Initialize router with middleware and routes
 */
function createRouter(): Router {
  const router = new Router();

  // Global middleware
  router.use(loggingMiddleware);

  // Health check endpoint (no rate limit)
  router.get('/health', async () => {
    return ResponseBuilder.success({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // API info endpoint
  router.get('/api', async () => {
    return ResponseBuilder.success({
      name: 'Cloudflare Workers MVP Template',
      version: '1.0.0',
      endpoints: {
        ai: [
          'POST /api/ai/chat',
          'POST /api/ai/chat/stream',
          'POST /api/ai/embeddings',
        ],
        database: [
          'GET /api/users',
          'GET /api/users/:id',
          'POST /api/users',
          'PUT /api/users/:id',
          'DELETE /api/users/:id',
        ],
        storage: [
          'POST /api/storage/upload',
          'GET /api/storage/:key',
          'DELETE /api/storage/:key',
          'GET /api/storage',
        ],
        cache: [
          'GET /api/cache/:key',
          'POST /api/cache',
          'DELETE /api/cache/:key',
        ],
      },
    });
  });

  // Rate limited API routes
  const apiRateLimit = rateLimitMiddleware({
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  });

  // AI Gateway routes
  router.post('/api/ai/chat', chatHandler, apiRateLimit);
  router.post('/api/ai/chat/stream', chatStreamHandler, apiRateLimit);
  router.post('/api/ai/embeddings', embeddingsHandler, apiRateLimit);

  // Database routes (with authentication example)
  router.get('/api/users', listUsersHandler);
  router.get('/api/users/:id', getUserHandler);
  router.post('/api/users', createUserHandler);
  router.put('/api/users/:id', updateUserHandler);
  router.delete('/api/users/:id', deleteUserHandler);

  // Storage routes
  router.post('/api/storage/upload', uploadHandler, apiRateLimit);
  router.get('/api/storage/:key', downloadHandler);
  router.delete('/api/storage/:key', deleteFileHandler);
  router.get('/api/storage', listFilesHandler);

  // Cache routes
  router.get('/api/cache/:key', getCacheHandler);
  router.post('/api/cache', setCacheHandler);
  router.delete('/api/cache/:key', deleteCacheHandler);

  // Custom 404 handler
  router.setNotFoundHandler(async (request) => {
    return ResponseBuilder.error(
      new Error('Endpoint not found'),
      404
    );
  });

  return router;
}

// Create router instance
const router = createRouter();

/**
 * Main Worker export
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return router.handle(request, env, ctx);
  },
};
