/**
 * D1 Database route examples
 * Demonstrates CRUD operations with Cloudflare D1
 */

import { z } from 'zod';
import type { Env } from '../types';
import { jsonResponse, errorResponses } from '../utils/response';
import { validateBody, validateQuery, schemas } from '../utils/validation';
import { NotFoundError, toApiError } from '../utils/errors';

/**
 * Example user schema
 */
const createUserSchema = z.object({
  email: schemas.email,
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['user', 'admin']).default('user'),
});

const updateUserSchema = z.object({
  email: schemas.email.optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['user', 'admin']).optional(),
});

/**
 * POST /api/db/users - Create a new user
 */
export async function handleCreateUser(request: Request, env: Env): Promise<Response> {
  try {
    const validation = await validateBody(request, createUserSchema);
    if (!validation.success) {
      return errorResponses.badRequest('Invalid request', { errors: validation.error });
    }

    const { email, name, role } = validation.data;

    // Insert user into D1 database
    const result = await env.DB.prepare(
      'INSERT INTO users (email, name, role, created_at) VALUES (?, ?, ?, ?);'
    )
      .bind(email, name, role, new Date().toISOString())
      .run();

    if (!result.success) {
      throw new Error('Failed to create user');
    }

    // Fetch the created user
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?;')
      .bind(result.meta.last_row_id)
      .first();

    return jsonResponse(user, 201);
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * GET /api/db/users - List all users with pagination
 */
export async function handleListUsers(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const validation = validateQuery(url, listUsersQuerySchema);
    
    if (!validation.success) {
      return errorResponses.badRequest('Invalid query parameters', { errors: validation.error });
    }

    const { page, limit, role } = validation.data;
    const offset = (page - 1) * limit;

    // Build query
    let query = 'SELECT * FROM users';
    const params: unknown[] = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    if (role) {
      countQuery += ' WHERE role = ?';
    }
    const countResult = await env.DB.prepare(countQuery)
      .bind(...(role ? [role] : []))
      .first();

    const total = (countResult as { total: number })?.total || 0;

    return jsonResponse({
      users: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * GET /api/db/users/:id - Get user by ID
 */
export async function handleGetUser(userId: string, env: Env): Promise<Response> {
  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?;')
      .bind(userId)
      .first();

    if (!user) {
      throw new NotFoundError('User');
    }

    return jsonResponse(user);
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.notFound(apiError.message);
  }
}

/**
 * PUT /api/db/users/:id - Update user
 */
export async function handleUpdateUser(
  userId: string,
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const validation = await validateBody(request, updateUserSchema);
    if (!validation.success) {
      return errorResponses.badRequest('Invalid request', { errors: validation.error });
    }

    const updates = validation.data;
    const fields: string[] = [];
    const values: unknown[] = [];

    // Build dynamic UPDATE query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return errorResponses.badRequest('No fields to update');
    }

    // Add updated_at timestamp
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);

    const result = await env.DB.prepare(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?;`
    )
      .bind(...values)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new NotFoundError('User');
    }

    // Fetch updated user
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?;')
      .bind(userId)
      .first();

    return jsonResponse(user);
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * DELETE /api/db/users/:id - Delete user
 */
export async function handleDeleteUser(userId: string, env: Env): Promise<Response> {
  try {
    const result = await env.DB.prepare('DELETE FROM users WHERE id = ?;')
      .bind(userId)
      .run();

    if (!result.success || result.meta.changes === 0) {
      throw new NotFoundError('User');
    }

    return jsonResponse({ message: 'User deleted successfully' });
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.notFound(apiError.message);
  }
}
