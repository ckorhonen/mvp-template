/**
 * Cloudflare Workers MVP Template
 * Main entry point with comprehensive routing and middleware
 */

import { Env } from './types/env';
import { handleAIChat, handleAICompletion } from './routes/ai';
import { handleDatabaseQuery, handleDatabaseCreate, handleDatabaseUpdate, handleDatabaseDelete } from './routes/database';
import { handleKVGet, handleKVSet, handleKVDelete, handleKVList } from './routes/kv';
import { handleR2Upload, handleR2Download, handleR2List, handleR2Delete } from './routes/r2';
import { handleHealth } from './routes/health';
import { handleCombinedExample } from './routes/combined';
import { corsMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { loggerMiddleware } from './middleware/logger';
import { jsonResponse, errorResponse } from './utils/response';
import { Router } from './utils/router';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Apply logging middleware
      loggerMiddleware(request, env);

      // Apply CORS middleware
      const corsResponse = corsMiddleware(request, env);
      if (corsResponse) return corsResponse;

      // Apply rate limiting middleware
      const rateLimitResponse = await rateLimitMiddleware(request, env);
      if (rateLimitResponse) return rateLimitResponse;

      // Initialize router
      const router = new Router();

      // Health check endpoint
      router.get('/health', () => handleHealth(request, env));
      router.get('/api/health', () => handleHealth(request, env));

      // AI Gateway routes
      router.post('/api/ai/chat', () => handleAIChat(request, env));
      router.post('/api/ai/completion', () => handleAICompletion(request, env));

      // D1 Database routes
      router.get('/api/database/:table', (params) => handleDatabaseQuery(request, env, params));
      router.post('/api/database/:table', (params) => handleDatabaseCreate(request, env, params));
      router.put('/api/database/:table/:id', (params) => handleDatabaseUpdate(request, env, params));
      router.delete('/api/database/:table/:id', (params) => handleDatabaseDelete(request, env, params));

      // KV Storage routes
      router.get('/api/kv/:key', (params) => handleKVGet(request, env, params));
      router.post('/api/kv/:key', (params) => handleKVSet(request, env, params));
      router.delete('/api/kv/:key', (params) => handleKVDelete(request, env, params));
      router.get('/api/kv', () => handleKVList(request, env));

      // R2 Storage routes
      router.post('/api/r2/upload', () => handleR2Upload(request, env));
      router.get('/api/r2/download/:key', (params) => handleR2Download(request, env, params));
      router.get('/api/r2/list', () => handleR2List(request, env));
      router.delete('/api/r2/:key', (params) => handleR2Delete(request, env, params));

      // Combined example route (uses multiple services)
      router.post('/api/example/combined', () => handleCombinedExample(request, env));

      // Route the request
      const response = await router.route(request);
      if (response) return response;

      // 404 Not Found
      return errorResponse('Route not found', 404);
    } catch (error) {
      // Global error handler
      return errorHandler(error as Error, request, env);
    }
  },
};
