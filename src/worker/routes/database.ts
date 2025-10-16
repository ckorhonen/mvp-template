import type { WorkerContext } from '../types/env';
import type { CreateUserInput, UpdateUserInput } from '../types/database';
import { createDatabaseClient } from '../db/client';
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  noContentResponse,
} from '../utils/response';
import { validateJsonBody, validateRequired, validateEmail, validatePagination } from '../utils/validation';
import { createLogger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

const logger = createLogger('DatabaseRoutes');

/**
 * GET /api/users
 * List all users with pagination
 */
export async function handleListUsers(ctx: WorkerContext): Promise<Response> {
  try {
    const url = new URL(ctx.request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const perPage = parseInt(url.searchParams.get('perPage') || '20');

    const { page: validPage, perPage: validPerPage } = validatePagination({ page, perPage });

    const db = createDatabaseClient(ctx.env);
    const { users, total } = await db.listUsers(validPage, validPerPage);

    return paginatedResponse(users, validPage, validPerPage, total);
  } catch (error) {
    logger.error('List users failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * GET /api/users/:id
 * Get a specific user by ID
 */
export async function handleGetUser(ctx: WorkerContext, id: string): Promise<Response> {
  try {
    const db = createDatabaseClient(ctx.env);
    const user = await db.getUserById(id);

    if (!user) {
      throw new NotFoundError('User');
    }

    return successResponse(user);
  } catch (error) {
    logger.error('Get user failed', { error, id });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * POST /api/users
 * Create a new user
 */
export async function handleCreateUser(ctx: WorkerContext): Promise<Response> {
  try {
    const body = await validateJsonBody<CreateUserInput>(ctx.request);
    validateRequired(body, ['email', 'name']);

    if (!validateEmail(body.email)) {
      throw new Error('Invalid email format');
    }

    const db = createDatabaseClient(ctx.env);
    const user = await db.createUser(body);

    logger.info('User created', { userId: user.id });

    return successResponse(user, undefined, 201);
  } catch (error) {
    logger.error('Create user failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * PUT /api/users/:id
 * Update an existing user
 */
export async function handleUpdateUser(
  ctx: WorkerContext,
  id: string
): Promise<Response> {
  try {
    const body = await validateJsonBody<UpdateUserInput>(ctx.request);

    if (body.email && !validateEmail(body.email)) {
      throw new Error('Invalid email format');
    }

    const db = createDatabaseClient(ctx.env);
    const user = await db.updateUser(id, body);

    logger.info('User updated', { userId: id });

    return successResponse(user);
  } catch (error) {
    logger.error('Update user failed', { error, id });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user (soft delete)
 */
export async function handleDeleteUser(
  ctx: WorkerContext,
  id: string
): Promise<Response> {
  try {
    const db = createDatabaseClient(ctx.env);
    await db.deleteUser(id);

    logger.info('User deleted', { userId: id });

    return noContentResponse();
  } catch (error) {
    logger.error('Delete user failed', { error, id });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}
