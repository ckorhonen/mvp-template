/**
 * D1 Database Routes
 * Example CRUD operations for users
 */

import { Env } from '../types';
import { createD1Service } from '../services/d1-database';
import { successResponse, errorResponse } from '../utils/response';
import { validateRequest } from '../utils/validation';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * POST /api/users - Create a new user
 */
export async function createUser(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateRequest(body, {
      email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const { email, name } = body;

    const db = createD1Service(env);

    // Check if user already exists
    const existingUser = await db.queryFirst<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }

    // Insert new user
    const userId = await db.insert('users', {
      email,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Fetch the created user
    const user = await db.findById<User>('users', userId);

    return successResponse({ user }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create user',
      500
    );
  }
}

/**
 * GET /api/users/:id - Get a user by ID
 */
export async function getUser(request: Request, env: Env, id: string): Promise<Response> {
  try {
    const db = createD1Service(env);
    const user = await db.findById<User>('users', id);

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get user',
      500
    );
  }
}

/**
 * GET /api/users - List users with pagination
 */
export async function listUsers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('per_page') || '10');

    const db = createD1Service(env);
    const result = await db.paginate<User>('users', {
      page,
      perPage,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    });

    return successResponse(result);
  } catch (error) {
    console.error('List users error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list users',
      500
    );
  }
}

/**
 * PUT /api/users/:id - Update a user
 */
export async function updateUser(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateRequest(body, {
      name: { type: 'string', required: false, minLength: 1, maxLength: 255 },
      email: { type: 'string', required: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    });

    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const db = createD1Service(env);

    // Check if user exists
    const user = await db.findById<User>('users', id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // If email is being updated, check for conflicts
    if (body.email && body.email !== user.email) {
      const existingUser = await db.queryFirst<User>(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        [body.email, id]
      );

      if (existingUser) {
        return errorResponse('Email already in use', 409);
      }
    }

    // Update user
    const updateData: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    await db.update('users', updateData, { column: 'id', value: id });

    // Fetch updated user
    const updatedUser = await db.findById<User>('users', id);

    return successResponse({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update user',
      500
    );
  }
}

/**
 * DELETE /api/users/:id - Delete a user
 */
export async function deleteUser(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const db = createD1Service(env);

    // Check if user exists
    const user = await db.findById<User>('users', id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Delete user
    await db.delete('users', { column: 'id', value: id });

    return successResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete user',
      500
    );
  }
}
