/**
 * D1 Database API Routes
 * CRUD operations for items using D1
 */

import { Env, Item } from '../types';
import { DbItem } from '../types/d1';
import { successResponse, errorResponse, ErrorResponses } from '../utils/response';
import { parseJsonBody, validateRequiredFields, parsePaginationParams } from '../utils/validation';
import { insert, update, find, findById, deleteRecords, count } from '../utils/db';
import { createLogger } from '../utils/logger';

/**
 * GET /api/db/items
 * List items with pagination
 */
export async function handleListItems(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'db-list');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const url = new URL(request.url);
    const { page, limit, offset } = parsePaginationParams(url);
    const status = url.searchParams.get('status');

    logger.info('Listing items', { page, limit, status });

    // Build where conditions
    const where: any[] = [{ field: 'deleted_at', operator: '=', value: null }];
    if (status) {
      where.push({ field: 'status', operator: '=', value: status });
    }

    // Get items and total count
    const [items, total] = await Promise.all([
      find<DbItem>(env.DB, 'items', where, { field: 'created_at', direction: 'DESC' }, limit, offset),
      count(env.DB, 'items', where),
    ]);

    // Transform database items to API format
    const transformedItems: Item[] = items.map(item => ({
      id: item.id,
      userId: item.user_id,
      title: item.title,
      description: item.description || undefined,
      status: item.status as any,
      tags: item.tags ? JSON.parse(item.tags) : undefined,
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return successResponse(
      transformedItems,
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('List items error', error);
    return ErrorResponses.internalError(
      'Failed to list items',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * GET /api/db/items/:id
 * Get a single item by ID
 */
export async function handleGetItem(
  request: Request,
  env: Env,
  itemId: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'db-get');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const id = parseInt(itemId, 10);
    if (isNaN(id)) {
      return ErrorResponses.badRequest(
        'Invalid item ID',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Getting item', { id });

    const item = await findById<DbItem>(env.DB, 'items', id);

    if (!item || item.deleted_at) {
      return ErrorResponses.notFound(
        'Item not found',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    const transformedItem: Item = {
      id: item.id,
      userId: item.user_id,
      title: item.title,
      description: item.description || undefined,
      status: item.status as any,
      tags: item.tags ? JSON.parse(item.tags) : undefined,
      metadata: item.metadata ? JSON.parse(item.metadata) : undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };

    return successResponse(
      transformedItem,
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Get item error', error);
    return ErrorResponses.internalError(
      'Failed to get item',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * POST /api/db/items
 * Create a new item
 */
export async function handleCreateItem(
  request: Request,
  env: Env,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'db-create');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const body = await parseJsonBody<{
      userId: number;
      title: string;
      description?: string;
      status?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }>(request);

    const validation = validateRequiredFields(body, ['userId', 'title']);
    if (!validation.valid) {
      return ErrorResponses.badRequest(
        `Missing required fields: ${validation.missing.join(', ')}`,
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Creating item', { title: body.title });

    const now = Math.floor(Date.now() / 1000);
    const itemId = await insert(env.DB, 'items', {
      user_id: body.userId,
      title: body.title,
      description: body.description || null,
      status: body.status || 'active',
      tags: body.tags ? JSON.stringify(body.tags) : null,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      created_at: now,
      updated_at: now,
    });

    logger.info('Item created', { id: itemId });

    return successResponse(
      { id: itemId },
      201,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Create item error', error);
    return ErrorResponses.internalError(
      'Failed to create item',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * PUT /api/db/items/:id
 * Update an existing item
 */
export async function handleUpdateItem(
  request: Request,
  env: Env,
  itemId: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'db-update');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const id = parseInt(itemId, 10);
    if (isNaN(id)) {
      return ErrorResponses.badRequest(
        'Invalid item ID',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    const body = await parseJsonBody<{
      title?: string;
      description?: string;
      status?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }>(request);

    logger.info('Updating item', { id });

    // Check if item exists
    const existing = await findById<DbItem>(env.DB, 'items', id);
    if (!existing || existing.deleted_at) {
      return ErrorResponses.notFound(
        'Item not found',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    // Build update data
    const updateData: any = {
      updated_at: Math.floor(Date.now() / 1000),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    if (body.metadata !== undefined) updateData.metadata = JSON.stringify(body.metadata);

    await update(env.DB, 'items', updateData, [{ field: 'id', operator: '=', value: id }]);

    logger.info('Item updated', { id });

    return successResponse(
      { id },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Update item error', error);
    return ErrorResponses.internalError(
      'Failed to update item',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}

/**
 * DELETE /api/db/items/:id
 * Delete an item (soft delete)
 */
export async function handleDeleteItem(
  request: Request,
  env: Env,
  itemId: string,
  requestId?: string
): Promise<Response> {
  const logger = createLogger(env, 'db-delete');
  const origin = request.headers.get('Origin') || undefined;

  try {
    const id = parseInt(itemId, 10);
    if (isNaN(id)) {
      return ErrorResponses.badRequest(
        'Invalid item ID',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Deleting item', { id });

    const now = Math.floor(Date.now() / 1000);
    const changes = await update(
      env.DB,
      'items',
      { deleted_at: now },
      [{ field: 'id', operator: '=', value: id }]
    );

    if (changes === 0) {
      return ErrorResponses.notFound(
        'Item not found',
        requestId,
        origin,
        env.CORS_ALLOWED_ORIGINS
      );
    }

    logger.info('Item deleted', { id });

    return successResponse(
      { id },
      200,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  } catch (error: any) {
    logger.error('Delete item error', error);
    return ErrorResponses.internalError(
      'Failed to delete item',
      error.message,
      requestId,
      origin,
      env.CORS_ALLOWED_ORIGINS
    );
  }
}
