/**
 * Database Routes
 * Example API routes demonstrating D1 database operations
 */

import type { Context } from '../types';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../utils/response';
import { createDatabase } from '../services/database';
import { validateRequired, isValidEmail } from '../utils/validation';
import { hashPassword } from '../utils/crypto';

/**
 * POST /api/users
 * Create a new user
 */
export async function createUser(ctx: Context): Promise<Response> {
  try {
    const body = await ctx.request.json<{
      email: string;
      name: string;
      password: string;
    }>();

    // Validate required fields
    const validation = validateRequired(body, ['email', 'name', 'password']);
    if (!validation.valid) {
      return badRequestResponse('Validation failed');
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return badRequestResponse('Invalid email format');
    }

    const db = createDatabase(ctx.env);

    // Check if user already exists
    const existingUser = await db.getUserByEmail(body.email);
    if (existingUser) {
      return errorResponse(
        { code: 'USER_EXISTS', message: 'User with this email already exists' },
        409
      );
    }

    // Hash password
    const passwordHash = await hashPassword(body.password);

    // Create user
    const user = await db.createUser({
      email: body.email,
      name: body.name,
      password_hash: passwordHash,
    });

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword, 201);
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
 * Get user by ID
 */
export async function getUser(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const userId = params?.id;
    if (!userId) {
      return badRequestResponse('User ID is required');
    }

    const db = createDatabase(ctx.env);
    const user = await db.getUserById(userId);

    if (!user) {
      return notFoundResponse('User not found');
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get user',
      500
    );
  }
}

/**
 * PATCH /api/users/:id
 * Update user
 */
export async function updateUser(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const userId = params?.id;
    if (!userId) {
      return badRequestResponse('User ID is required');
    }

    const body = await ctx.request.json<{
      name?: string;
      email?: string;
    }>();

    // Validate email if provided
    if (body.email && !isValidEmail(body.email)) {
      return badRequestResponse('Invalid email format');
    }

    const db = createDatabase(ctx.env);
    const user = await db.updateUser(userId, body);

    if (!user) {
      return notFoundResponse('User not found');
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return successResponse(userWithoutPassword);
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
 * Delete user
 */
export async function deleteUser(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const userId = params?.id;
    if (!userId) {
      return badRequestResponse('User ID is required');
    }

    const db = createDatabase(ctx.env);
    const deleted = await db.deleteUser(userId);

    if (!deleted) {
      return notFoundResponse('User not found');
    }

    return successResponse({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete user',
      500
    );
  }
}
