/**
 * D1 Database Routes
 * Example endpoints showcasing D1 database operations
 */

import { createDatabase } from '../lib/database';
import { jsonResponse, errorResponse, parseJSON } from '../lib/utils';
import type { Env } from '../types';

export async function handleDatabaseRoutes(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  const db = createDatabase(env);

  try {
    // GET /api/db/users - List users
    if (path === '/api/db/users' && request.method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const offset = (page - 1) * limit;

      const users = await db.findMany('users', {
        orderBy: 'created_at DESC',
        limit,
        offset,
      });

      const total = await db.count('users');

      return jsonResponse({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    // GET /api/db/users/:id - Get user by ID
    if (path.match(/^\/api\/db\/users\/\d+$/) && request.method === 'GET') {
      const id = parseInt(path.split('/').pop()!);
      const user = await db.findOne('users', 'id = ?', [id]);

      if (!user) {
        return errorResponse('User not found', 404);
      }

      return jsonResponse(user);
    }

    // POST /api/db/users - Create user
    if (path === '/api/db/users' && request.method === 'POST') {
      const body = await parseJSON(request);
      if (!body || !body.email || !body.name) {
        return errorResponse('Email and name are required', 400);
      }

      // Check if user exists
      const exists = await db.exists('users', 'email = ?', [body.email]);
      if (exists) {
        return errorResponse('User already exists', 409);
      }

      const userId = await db.insert('users', {
        email: body.email,
        name: body.name,
      });

      if (!userId) {
        return errorResponse('Failed to create user', 500);
      }

      const user = await db.findOne('users', 'id = ?', [userId]);
      return jsonResponse(user, 201);
    }

    // PUT /api/db/users/:id - Update user
    if (path.match(/^\/api\/db\/users\/\d+$/) && request.method === 'PUT') {
      const id = parseInt(path.split('/').pop()!);
      const body = await parseJSON(request);

      if (!body) {
        return errorResponse('Invalid request body', 400);
      }

      const exists = await db.exists('users', 'id = ?', [id]);
      if (!exists) {
        return errorResponse('User not found', 404);
      }

      const success = await db.update(
        'users',
        {
          ...body,
          updated_at: new Date().toISOString(),
        },
        'id = ?',
        [id]
      );

      if (!success) {
        return errorResponse('Failed to update user', 500);
      }

      const user = await db.findOne('users', 'id = ?', [id]);
      return jsonResponse(user);
    }

    // DELETE /api/db/users/:id - Delete user
    if (path.match(/^\/api\/db\/users\/\d+$/) && request.method === 'DELETE') {
      const id = parseInt(path.split('/').pop()!);

      const exists = await db.exists('users', 'id = ?', [id]);
      if (!exists) {
        return errorResponse('User not found', 404);
      }

      const success = await db.delete('users', 'id = ?', [id]);

      if (!success) {
        return errorResponse('Failed to delete user', 500);
      }

      return jsonResponse({ success: true }, 204);
    }

    // GET /api/db/stats - Database statistics
    if (path === '/api/db/stats' && request.method === 'GET') {
      const userCount = await db.count('users');
      const sessionCount = await db.count('sessions');
      const logCount = await db.count('api_logs');

      return jsonResponse({
        users: userCount,
        sessions: sessionCount,
        logs: logCount,
      });
    }

    return errorResponse('Not found', 404);
  } catch (error) {
    console.error('Database route error:', error);
    return errorResponse(
      'Internal server error',
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}
