/**
 * API Routes Example
 * 
 * This file demonstrates how to use all the Cloudflare services
 * and utilities in your API endpoints.
 */

import { Env } from '../types';
import { createAIService } from '../services/ai';
import { createDatabaseService } from '../services/database';
import { createLogger } from '../utils/logger';
import {
  createSuccessResponse,
  badRequest,
  internalServerError,
  notFound,
} from '../utils/response';
import { withCors } from '../utils/cors';

/**
 * Router class for handling API requests
 */
export class ApiRouter {
  private env: Env;
  private logger: ReturnType<typeof createLogger>;

  constructor(env: Env) {
    this.env = env;
    this.logger = createLogger(env);
  }

  /**
   * Handle API requests
   */
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Apply CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      // Route matching
      if (path === '/api/health') {
        return this.handleHealth(request);
      } else if (path === '/api/users' && request.method === 'GET') {
        return this.handleGetUsers(request);
      } else if (path === '/api/users' && request.method === 'POST') {
        return this.handleCreateUser(request);
      } else if (path.startsWith('/api/users/') && request.method === 'GET') {
        return this.handleGetUser(request);
      } else if (path === '/api/ai/chat' && request.method === 'POST') {
        return this.handleAIChat(request);
      } else if (path === '/api/upload' && request.method === 'POST') {
        return this.handleUpload(request);
      } else if (path === '/api/cache' && request.method === 'GET') {
        return this.handleCacheGet(request);
      } else if (path === '/api/cache' && request.method === 'POST') {
        return this.handleCacheSet(request);
      } else if (path === '/api/analytics' && request.method === 'POST') {
        return this.handleAnalytics(request);
      } else {
        return notFound('Endpoint not found');
      }
    } catch (error) {
      this.logger.error('API error', error as Error);
      return internalServerError('An error occurred processing your request');
    }
  }

  /**
   * Health check endpoint
   */
  private async handleHealth(_request: Request): Promise<Response> {
    return createSuccessResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        cache: 'connected',
        ai: 'connected',
      },
    });
  }

  /**
   * Get all users
   */
  private async handleGetUsers(request: Request): Promise<Response> {
    const db = createDatabaseService(this.env);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Check cache first
    const cacheKey = `users:list:${limit}:${offset}`;
    const cached = await this.env.CACHE.get(cacheKey);
    if (cached) {
      this.logger.info('Cache hit for users list');
      return createSuccessResponse(JSON.parse(cached));
    }

    // Query database
    const users = await db
      .select('users')
      .fields(['id', 'email', 'name', 'created_at'])
      .orderBy('created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .all();

    // Cache result
    await this.env.CACHE.put(cacheKey, JSON.stringify(users), {
      expirationTtl: 300, // 5 minutes
    });

    return createSuccessResponse(users);
  }

  /**
   * Get single user
   */
  private async handleGetUser(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    if (!userId) {
      return badRequest('User ID is required');
    }

    const db = createDatabaseService(this.env);

    // Check cache
    const cacheKey = `user:${userId}`;
    const cached = await this.env.CACHE.get(cacheKey);
    if (cached) {
      return createSuccessResponse(JSON.parse(cached));
    }

    // Query database
    const user = await db
      .select('users', { id: parseInt(userId) })
      .fields(['id', 'email', 'name', 'created_at'])
      .first();

    if (!user) {
      return notFound('User not found');
    }

    // Cache result
    await this.env.CACHE.put(cacheKey, JSON.stringify(user), {
      expirationTtl: 600,
    });

    return createSuccessResponse(user);
  }

  /**
   * Create new user
   */
  private async handleCreateUser(request: Request): Promise<Response> {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return badRequest('Email is required');
    }

    const db = createDatabaseService(this.env);

    try {
      // Insert user
      const result = await db.insert('users', {
        email,
        name: name || null,
        is_active: 1,
      });

      // Invalidate cache
      await this.env.CACHE.delete('users:list:10:0');

      // Track analytics
      if (this.env.ANALYTICS) {
        await this.env.ANALYTICS.writeDataPoint({
          blobs: ['user_created', email],
          doubles: [1],
          indexes: ['users'],
        });
      }

      // Queue welcome email
      if (this.env.EMAIL_QUEUE) {
        await this.env.EMAIL_QUEUE.send({
          type: 'welcome_email',
          userId: result.id,
          email,
        });
      }

      return createSuccessResponse(
        {
          id: result.id,
          email,
          name,
        },
        { status: 201 }
      );
    } catch (error) {
      this.logger.error('Failed to create user', error as Error);
      return internalServerError('Failed to create user');
    }
  }

  /**
   * AI Chat endpoint
   */
  private async handleAIChat(request: Request): Promise<Response> {
    const body = await request.json();
    const { message, systemPrompt } = body;

    if (!message) {
      return badRequest('Message is required');
    }

    try {
      const ai = createAIService(this.env);
      const response = await ai.generateText(message, systemPrompt);

      // Track AI usage
      if (this.env.ANALYTICS) {
        await this.env.ANALYTICS.writeDataPoint({
          blobs: ['ai_request', 'chat'],
          doubles: [1],
          indexes: ['ai', 'usage'],
        });
      }

      return createSuccessResponse({ response });
    } catch (error) {
      this.logger.error('AI request failed', error as Error);
      return internalServerError('AI request failed');
    }
  }

  /**
   * File upload endpoint
   */
  private async handleUpload(request: Request): Promise<Response> {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file) {
      return badRequest('File is required');
    }

    if (!userId) {
      return badRequest('User ID is required');
    }

    try {
      // Generate unique key
      const timestamp = Date.now();
      const key = `uploads/${userId}/${timestamp}-${file.name}`;

      // Upload to R2
      await this.env.UPLOADS.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          uploadedBy: userId,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Save metadata to database
      const db = createDatabaseService(this.env);
      const result = await db.insert('uploads', {
        user_id: parseInt(userId),
        key,
        filename: file.name,
        size: file.size,
        content_type: file.type,
      });

      // Queue for processing
      if (this.env.TASK_QUEUE) {
        await this.env.TASK_QUEUE.send({
          type: 'process_upload',
          uploadId: result.id,
          key,
          userId,
        });
      }

      return createSuccessResponse(
        {
          id: result.id,
          key,
          filename: file.name,
          size: file.size,
        },
        { status: 201 }
      );
    } catch (error) {
      this.logger.error('Upload failed', error as Error);
      return internalServerError('Upload failed');
    }
  }

  /**
   * Cache get endpoint
   */
  private async handleCacheGet(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return badRequest('Key is required');
    }

    const value = await this.env.CACHE.get(key);

    if (!value) {
      return notFound('Key not found in cache');
    }

    return createSuccessResponse({ key, value });
  }

  /**
   * Cache set endpoint
   */
  private async handleCacheSet(request: Request): Promise<Response> {
    const body = await request.json();
    const { key, value, ttl } = body;

    if (!key || !value) {
      return badRequest('Key and value are required');
    }

    await this.env.CACHE.put(key, value, {
      expirationTtl: ttl || 3600,
    });

    return createSuccessResponse({ key, cached: true });
  }

  /**
   * Analytics endpoint
   */
  private async handleAnalytics(request: Request): Promise<Response> {
    const body = await request.json();
    const { event, data } = body;

    if (!event) {
      return badRequest('Event name is required');
    }

    if (this.env.ANALYTICS) {
      await this.env.ANALYTICS.writeDataPoint({
        blobs: [event, JSON.stringify(data || {})],
        doubles: [1],
        indexes: ['custom_events'],
      });

      return createSuccessResponse({ tracked: true });
    }

    return internalServerError('Analytics not configured');
  }
}

/**
 * Create API router with CORS
 */
export function createApiRouter(env: Env) {
  const router = new ApiRouter(env);
  return (request: Request) => {
    const handler = router.handle.bind(router);
    return withCors(handler, {
      allowedOrigins: env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    })(request);
  };
}
