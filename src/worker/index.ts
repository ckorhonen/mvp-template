/**
 * Cloudflare Workers Entry Point
 * 
 * Main worker file with routing, middleware, and error handling.
 */

import type { Env } from './types';
import { corsPreflightResponse, methodNotAllowedResponse, notFoundResponse, serverErrorResponse } from './utils/response';
import { createRateLimiter, getClientIdentifier, addRateLimitHeaders, rateLimitResponse } from './utils/rate-limit';
import { handleAIChat, handleAIStream, handleAIModels } from './routes/ai';
import { handleCreateUser, handleGetUser, handleListUsers, handleUpdateUser, handleDeleteUser } from './routes/database';
import { handleGetCache, handleSetCache, handleDeleteCache, handleUpload, handleGetFile, handleDeleteFile, handleListFiles } from './routes/storage';

/**
 * Router - matches URL patterns to handlers
 */
class Router {
  private routes: Map<string, Map<string, (request: Request, env: Env, ...args: string[]) => Promise<Response>>> = new Map();

  add(method: string, pattern: RegExp, handler: (request: Request, env: Env, ...args: string[]) => Promise<Response>) {
    if (!this.routes.has(method)) {
      this.routes.set(method, new Map());
    }
    this.routes.get(method)!.set(pattern.source, handler);
  }

  async handle(request: Request, env: Env): Promise<Response | null> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    const methodRoutes = this.routes.get(method);
    if (!methodRoutes) return null;

    for (const [pattern, handler] of methodRoutes) {
      const regex = new RegExp(pattern);
      const match = path.match(regex);
      if (match) {
        const params = match.slice(1);
        return await handler(request, env, ...params);
      }
    }

    return null;
  }
}

// Initialize router
const router = new Router();

// AI Routes
router.add('POST', /^\/api\/ai\/chat$/, handleAIChat);
router.add('POST', /^\/api\/ai\/stream$/, handleAIStream);
router.add('GET', /^\/api\/ai\/models$/, handleAIModels);

// Database Routes
router.add('POST', /^\/api\/users$/, handleCreateUser);
router.add('GET', /^\/api\/users$/, handleListUsers);
router.add('GET', /^\/api\/users\/([^\/]+)$/, handleGetUser);
router.add('PUT', /^\/api\/users\/([^\/]+)$/, handleUpdateUser);
router.add('DELETE', /^\/api\/users\/([^\/]+)$/, handleDeleteUser);

// Storage Routes
router.add('GET', /^\/api\/cache\/([^\/]+)$/, handleGetCache);
router.add('PUT', /^\/api\/cache\/([^\/]+)$/, handleSetCache);
router.add('DELETE', /^\/api\/cache\/([^\/]+)$/, handleDeleteCache);
router.add('POST', /^\/api\/uploads$/, handleUpload);
router.add('GET', /^\/api\/uploads$/, handleListFiles);
router.add('GET', /^\/api\/uploads\/([^\/]+)$/, handleGetFile);
router.add('DELETE', /^\/api\/uploads\/([^\/]+)$/, handleDeleteFile);

/**
 * Main request handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return corsPreflightResponse();
      }

      // Rate limiting
      if (env.FEATURE_RATE_LIMITING_ENABLED === 'true') {
        const identifier = getClientIdentifier(request);
        const rateLimiter = createRateLimiter(env);
        const rateLimit = await rateLimiter.check(identifier);

        if (!rateLimit.allowed) {
          return rateLimitResponse(rateLimit.reset - Math.floor(Date.now() / 1000));
        }
      }

      // Route the request
      const response = await router.handle(request, env);
      
      if (response) {
        // Add rate limit headers if enabled
        if (env.FEATURE_RATE_LIMITING_ENABLED === 'true') {
          const identifier = getClientIdentifier(request);
          const rateLimiter = createRateLimiter(env);
          const status = await rateLimiter.getStatus(identifier);
          return addRateLimitHeaders(response, status);
        }
        return response;
      }

      // No route matched
      return notFoundResponse();
    } catch (error) {
      console.error('Worker error:', error);
      return serverErrorResponse('Internal server error', error as Error);
    }
  },

  /**
   * Scheduled handler for cron triggers
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered:', event.cron);
    // Add your scheduled tasks here
  },

  /**
   * Queue handler for processing queue messages
   */
  async queue(batch: MessageBatch<unknown>, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      console.log('Processing queue message:', message.id);
      // Process your queue messages here
      message.ack();
    }
  },
};
