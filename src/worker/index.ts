import type { Env, WorkerContext } from './types/env';
import { errorResponse } from './utils/response';
import { getCorsOptions, handleCorsPreflightRequest, addCorsHeaders } from './utils/cors';
import { createLogger } from './utils/logger';

// Import route handlers
import { handleChatCompletion, handleEmbedding, handleImageGeneration } from './routes/ai';
import {
  handleListUsers,
  handleGetUser,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
} from './routes/database';
import {
  handleGetCache,
  handleSetCache,
  handleDeleteCache,
  handleUpload,
  handleDownload,
  handleDeleteFile,
} from './routes/storage';
import { handleTrackEvent, handleGetEvents } from './routes/analytics';
import { handleHealthCheck, handlePing } from './routes/health';

const logger = createLogger('Worker');

/**
 * Main worker entry point
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsOptions = getCorsOptions(env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflightRequest(request, corsOptions);
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      logger.info('Request received', {
        method,
        path,
        userAgent: request.headers.get('User-Agent'),
      });

      // Create worker context
      const workerCtx: WorkerContext = { env, ctx, request };

      // Route the request
      let response: Response;

      // Health endpoints
      if (path === '/api/health') {
        response = await handleHealthCheck(workerCtx);
      } else if (path === '/api/ping') {
        response = await handlePing(workerCtx);
      }
      // AI endpoints
      else if (path === '/api/ai/chat' && method === 'POST') {
        response = await handleChatCompletion(workerCtx);
      } else if (path === '/api/ai/embed' && method === 'POST') {
        response = await handleEmbedding(workerCtx);
      } else if (path === '/api/ai/image' && method === 'POST') {
        response = await handleImageGeneration(workerCtx);
      }
      // User endpoints
      else if (path === '/api/users' && method === 'GET') {
        response = await handleListUsers(workerCtx);
      } else if (path === '/api/users' && method === 'POST') {
        response = await handleCreateUser(workerCtx);
      } else if (path.match(/^\/api\/users\/[^/]+$/) && method === 'GET') {
        const id = path.split('/').pop()!;
        response = await handleGetUser(workerCtx, id);
      } else if (path.match(/^\/api\/users\/[^/]+$/) && method === 'PUT') {
        const id = path.split('/').pop()!;
        response = await handleUpdateUser(workerCtx, id);
      } else if (path.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
        const id = path.split('/').pop()!;
        response = await handleDeleteUser(workerCtx, id);
      }
      // Cache endpoints
      else if (path.match(/^\/api\/cache\/[^/]+$/) && method === 'GET') {
        const key = path.split('/').pop()!;
        response = await handleGetCache(workerCtx, key);
      } else if (path.match(/^\/api\/cache\/[^/]+$/) && method === 'PUT') {
        const key = path.split('/').pop()!;
        response = await handleSetCache(workerCtx, key);
      } else if (path.match(/^\/api\/cache\/[^/]+$/) && method === 'DELETE') {
        const key = path.split('/').pop()!;
        response = await handleDeleteCache(workerCtx, key);
      }
      // File upload/download endpoints
      else if (path === '/api/upload' && method === 'POST') {
        response = await handleUpload(workerCtx);
      } else if (path.match(/^\/api\/files\/[^/]+$/) && method === 'GET') {
        const key = path.split('/').pop()!;
        response = await handleDownload(workerCtx, key);
      } else if (path.match(/^\/api\/files\/[^/]+$/) && method === 'DELETE') {
        const key = path.split('/').pop()!;
        response = await handleDeleteFile(workerCtx, key);
      }
      // Analytics endpoints
      else if (path === '/api/analytics/track' && method === 'POST') {
        response = await handleTrackEvent(workerCtx);
      } else if (path === '/api/analytics/events' && method === 'GET') {
        response = await handleGetEvents(workerCtx);
      }
      // 404 Not Found
      else {
        response = errorResponse(new Error('Not found'), 404);
      }

      // Add CORS headers to response
      return addCorsHeaders(response, request, corsOptions);
    } catch (error) {
      logger.error('Unhandled error', { error });
      const response = errorResponse(
        error as Error,
        500,
        env.ENVIRONMENT === 'development'
      );
      return addCorsHeaders(response, request, getCorsOptions(env));
    }
  },
};
