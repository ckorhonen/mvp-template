/**
 * User routes with D1 database integration
 */

import type { Env } from '../types/env';
import type { User, CreateUserInput, UpdateUserInput } from '../types/models';
import { successResponse, notFoundError, validationError } from '../utils/response';
import { parseJsonBody, validateRequiredFields, isValidEmail, validatePaginationParams } from '../utils/validation';
import { DatabaseError, NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

/**
 * List all users with pagination
 */
export async function listUsers(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const url = new URL(request.url);
    const { page, limit, offset } = validatePaginationParams(url.searchParams);

    logger.info('Listing users', { page, limit });

    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first<{ count: number }>();

    const total = countResult?.count || 0;

    // Get paginated users
    const { results } = await env.DB.prepare(
      'SELECT id, email, name, created_at as createdAt, updated_at as updatedAt FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
      .bind(limit, offset)
      .all<User>();

    logger.info('Users retrieved', { count: results.length, total });

    return successResponse(results, 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to list users', error);
    throw new DatabaseError(
      'Failed to retrieve users',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * Get a single user by ID
 */
export async function getUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Fetching user', { userId });

    const user = await env.DB.prepare(
      'SELECT id, email, name, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<User>();

    if (!user) {
      logger.warn('User not found', { userId });
      throw new NotFoundError('User');
    }

    logger.info('User retrieved', { userId });

    return successResponse(user);
  } catch (error) {
    logger.error('Failed to get user', error);
    if (error instanceof NotFoundError) {
      return notFoundError('User');
    }
    throw new DatabaseError(
      'Failed to retrieve user',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * Create a new user
 */
export async function createUser(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const body = await parseJsonBody<CreateUserInput>(request);
    
    // Validate required fields
    const validation = validateRequiredFields(body, ['email', 'name']);
    if (!validation.valid) {
      return validationError('Missing required fields', {
        missing: validation.missing,
      });
    }

    // Validate email format
    if (!isValidEmail(body.email)) {
      return validationError('Invalid email format');
    }

    logger.info('Creating user', { email: body.email });

    // Generate UUID for user ID
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Insert user
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(userId, body.email, body.name, now, now)
      .run();

    // Retrieve created user
    const user = await env.DB.prepare(
      'SELECT id, email, name, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<User>();

    logger.info('User created', { userId });

    return successResponse(user, 201);
  } catch (error) {
    logger.error('Failed to create user', error);
    throw new DatabaseError(
      'Failed to create user',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * Update an existing user
 */
export async function updateUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const body = await parseJsonBody<UpdateUserInput>(request);
    
    // Validate at least one field is provided
    if (!body.email && !body.name) {
      return validationError('At least one field (email or name) must be provided');
    }

    // Validate email if provided
    if (body.email && !isValidEmail(body.email)) {
      return validationError('Invalid email format');
    }

    logger.info('Updating user', { userId });

    // Check if user exists
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!existingUser) {
      logger.warn('User not found', { userId });
      throw new NotFoundError('User');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (body.email) {
      updates.push('email = ?');
      values.push(body.email);
    }
    if (body.name) {
      updates.push('name = ?');
      values.push(body.name);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    await env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    // Retrieve updated user
    const user = await env.DB.prepare(
      'SELECT id, email, name, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<User>();

    logger.info('User updated', { userId });

    return successResponse(user);
  } catch (error) {
    logger.error('Failed to update user', error);
    if (error instanceof NotFoundError) {
      return notFoundError('User');
    }
    throw new DatabaseError(
      'Failed to update user',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

/**
 * Delete a user
 */
export async function deleteUser(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Deleting user', { userId });

    // Check if user exists
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!existingUser) {
      logger.warn('User not found', { userId });
      throw new NotFoundError('User');
    }

    // Delete user
    await env.DB.prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();

    logger.info('User deleted', { userId });

    return successResponse({ message: 'User deleted successfully' }, 200);
  } catch (error) {
    logger.error('Failed to delete user', error);
    if (error instanceof NotFoundError) {
      return notFoundError('User');
    }
    throw new DatabaseError(
      'Failed to delete user',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}
