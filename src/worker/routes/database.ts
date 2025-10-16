/**
 * Database Routes
 * Handles all database-related API endpoints
 */

import type { Env } from '../types';
import { createD1Service } from '../services/d1-database';
import { jsonResponse, errorResponse } from '../utils/response';

/**
 * POST /api/users
 * Create a new user
 */
export async function createUser(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as {
      email: string;
      name: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.email || !body.name) {
      return errorResponse('Email and name are required', 400);
    }

    const db = createD1Service(env);

    // Check if user exists
    const existing = await db.queryOne(
      'SELECT id FROM users WHERE email = ?',
      [body.email]
    );

    if (existing) {
      return errorResponse('User already exists', 409);
    }

    const userId = await db.insert('users', {
      email: body.email,
      name: body.name,
      metadata: JSON.stringify(body.metadata || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [
      userId,
    ]);

    return jsonResponse(
      {
        success: true,
        data: user,
      },
      201
    );
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create user',
      500
    );
  }
}

/**
 * GET /api/users/:id
 * Get a user by ID
 */
export async function getUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const db = createD1Service(env);
    const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [
      userId,
    ]);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return jsonResponse({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get user',
      500
    );
  }
}

/**
 * GET /api/users
 * List users with pagination
 */
export async function listUsers(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '10', 10);
    const offset = (page - 1) * perPage;

    const db = createD1Service(env);

    const users = await db.select('users', {
      orderBy: { column: 'created_at', direction: 'DESC' },
      limit: perPage,
      offset,
    });

    const total = await db.count('users');

    return jsonResponse({
      success: true,
      data: {
        users,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list users',
      500
    );
  }
}

/**
 * PUT /api/users/:id
 * Update a user
 */
export async function updateUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const body = await request.json() as {
      name?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.name && !body.metadata) {
      return errorResponse('No update data provided', 400);
    }

    const db = createD1Service(env);

    // Check if user exists
    const existing = await db.queryOne('SELECT id FROM users WHERE id = ?', [
      userId,
    ]);

    if (!existing) {
      return errorResponse('User not found', 404);
    }

    const updateData: Record<string, string> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name) {
      updateData.name = body.name;
    }

    if (body.metadata) {
      updateData.metadata = JSON.stringify(body.metadata);
    }

    await db.update('users', updateData, {
      column: 'id',
      value: userId,
    });

    const user = await db.queryOne('SELECT * FROM users WHERE id = ?', [
      userId,
    ]);

    return jsonResponse({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update user',
      500
    );
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user
 */
export async function deleteUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const db = createD1Service(env);

    // Check if user exists
    const existing = await db.queryOne('SELECT id FROM users WHERE id = ?', [
      userId,
    ]);

    if (!existing) {
      return errorResponse('User not found', 404);
    }

    await db.delete('users', {
      column: 'id',
      value: userId,
    });

    return jsonResponse({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete user',
      500
    );
  }
}
