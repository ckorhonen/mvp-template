/**
 * D1 Database Routes
 * 
 * Example routes demonstrating D1 database operations.
 */

import type { Env } from '../types';
import { createD1Service } from '../services/d1-database';
import { successResponse, errorResponse, notFoundResponse, serverErrorResponse } from '../utils/response';
import { parseAndValidateJSON, validateRequired, validateEmail } from '../utils/validation';

interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

/**
 * POST /api/users
 * Create a new user
 */
export async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseAndValidateJSON<{
      email: string;
      name: string;
    }>(request);

    const errors = validateRequired(body, ['email', 'name']);
    if (errors.length > 0) {
      return errorResponse('Validation failed', { details: errors });
    }

    if (!validateEmail(body.email)) {
      return errorResponse('Invalid email format');
    }

    const db = createD1Service(env);
    
    // Check if user already exists
    const existing = await db.queryOne<User>(
      'SELECT id FROM users WHERE email = ?',
      [body.email]
    );

    if (existing) {
      return errorResponse('User with this email already exists', { status: 409 });
    }

    const userId = await db.insert('users', {
      email: body.email,
      name: body.name,
      created_at: new Date().toISOString(),
    });

    return successResponse({ id: userId }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return serverErrorResponse('Failed to create user', error as Error);
  }
}

/**
 * GET /api/users/:id
 * Get a user by ID
 */
export async function handleGetUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const db = createD1Service(env);
    const user = await db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return notFoundResponse('User not found');
    }

    return successResponse(user);
  } catch (error) {
    console.error('Get user error:', error);
    return serverErrorResponse('Failed to get user', error as Error);
  }
}

/**
 * GET /api/users
 * List all users with pagination
 */
export async function handleListUsers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') || '10', 10);
    const offset = (page - 1) * perPage;

    const db = createD1Service(env);
    
    const [users, totalCount] = await Promise.all([
      db.query<User>(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [perPage, offset]
      ),
      db.count('users'),
    ]);

    return successResponse({
      users,
      pagination: {
        page,
        per_page: perPage,
        total: totalCount,
        total_pages: Math.ceil(totalCount / perPage),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    return serverErrorResponse('Failed to list users', error as Error);
  }
}

/**
 * PUT /api/users/:id
 * Update a user
 */
export async function handleUpdateUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const body = await parseAndValidateJSON<{
      email?: string;
      name?: string;
    }>(request);

    if (body.email && !validateEmail(body.email)) {
      return errorResponse('Invalid email format');
    }

    const db = createD1Service(env);
    
    const updated = await db.update('users', body, {
      column: 'id',
      value: userId,
    });

    if (updated === 0) {
      return notFoundResponse('User not found');
    }

    return successResponse({ updated: true });
  } catch (error) {
    console.error('Update user error:', error);
    return serverErrorResponse('Failed to update user', error as Error);
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user
 */
export async function handleDeleteUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  try {
    const db = createD1Service(env);
    
    const deleted = await db.delete('users', {
      column: 'id',
      value: userId,
    });

    if (deleted === 0) {
      return notFoundResponse('User not found');
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return serverErrorResponse('Failed to delete user', error as Error);
  }
}
