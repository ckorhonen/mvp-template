import { RouteHandler } from '../types';
import { ResponseBuilder } from '../utils/response';
import { RequestValidator } from '../utils/validation';
import { Database } from '../utils/database';

/**
 * D1 Database route handlers
 */

interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

/**
 * GET /api/users - List all users
 */
export const listUsersHandler: RouteHandler = async (request, env) => {
  const db = new Database(env.DB);
  const users = await db.query<User>('SELECT * FROM users ORDER BY created_at DESC');
  
  return ResponseBuilder.success({ users });
};

/**
 * GET /api/users/:id - Get user by ID
 */
export const getUserHandler: RouteHandler = async (request, env, ctx, params) => {
  const userId = params?.id;
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  const db = new Database(env.DB);
  const user = await db.queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    return ResponseBuilder.error(
      new Error('User not found'),
      404
    );
  }

  return ResponseBuilder.success({ user });
};

/**
 * POST /api/users - Create a new user
 */
export const createUserHandler: RouteHandler = async (request, env) => {
  const body = await RequestValidator.parseJSON<{
    email: string;
    name: string;
  }>(request);

  RequestValidator.validateRequired(body, ['email', 'name']);

  if (!RequestValidator.isValidEmail(body.email)) {
    return ResponseBuilder.error(
      new Error('Invalid email format'),
      400
    );
  }

  const db = new Database(env.DB);
  const result = await db.execute(
    'INSERT INTO users (email, name) VALUES (?, ?)',
    [body.email, body.name]
  );

  const user = await db.queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [result.meta.last_row_id]
  );

  return ResponseBuilder.success({ user }, 201);
};

/**
 * PUT /api/users/:id - Update user
 */
export const updateUserHandler: RouteHandler = async (request, env, ctx, params) => {
  const userId = params?.id;
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  const body = await RequestValidator.parseJSON<{
    email?: string;
    name?: string;
  }>(request);

  const updates: string[] = [];
  const values: any[] = [];

  if (body.email) {
    if (!RequestValidator.isValidEmail(body.email)) {
      return ResponseBuilder.error(
        new Error('Invalid email format'),
        400
      );
    }
    updates.push('email = ?');
    values.push(body.email);
  }

  if (body.name) {
    updates.push('name = ?');
    values.push(body.name);
  }

  if (updates.length === 0) {
    return ResponseBuilder.error(
      new Error('No fields to update'),
      400
    );
  }

  values.push(userId);

  const db = new Database(env.DB);
  await db.execute(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const user = await db.queryOne<User>(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );

  return ResponseBuilder.success({ user });
};

/**
 * DELETE /api/users/:id - Delete user
 */
export const deleteUserHandler: RouteHandler = async (request, env, ctx, params) => {
  const userId = params?.id;
  
  if (!userId) {
    throw new Error('User ID is required');
  }

  const db = new Database(env.DB);
  await db.execute('DELETE FROM users WHERE id = ?', [userId]);

  return ResponseBuilder.success({ message: 'User deleted successfully' });
};
