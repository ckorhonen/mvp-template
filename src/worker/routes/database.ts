/**
 * D1 Database Route Handlers
 * CRUD operations for D1 database
 */

import { Env, DatabaseRecord } from '../types/env';
import { jsonResponse, errorResponse, createdResponse, noContentResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { Logger } from '../utils/logger';

/**
 * Query records from a table
 */
export async function handleDatabaseQuery(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { table } = params;

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    logger.info('Database query', { table, limit, offset });

    // Query the database
    const query = `SELECT * FROM ${table} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const result = await env.DB.prepare(query).bind(limit, offset).all();

    // Get total count
    const countResult = await env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
    const total = (countResult as any)?.count || 0;

    return jsonResponse({
      records: result.results,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    logger.error('Database query error', error);
    return errorResponse('Failed to query database', 500, 'DATABASE_ERROR', {
      table,
      error: (error as Error).message,
    });
  }
}

/**
 * Create a new record in a table
 */
export async function handleDatabaseCreate(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { table } = params;

  try {
    const body = await request.json() as DatabaseRecord;

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError('Request body cannot be empty');
    }

    logger.info('Database create', { table, data: body });

    // Build INSERT query
    const columns = Object.keys(body).join(', ');
    const placeholders = Object.keys(body).map(() => '?').join(', ');
    const values = Object.values(body);

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await env.DB.prepare(query).bind(...values).first();

    if (!result) {
      throw new Error('Failed to create record');
    }

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['database-create'],
        indexes: [table],
      });
    }

    return createdResponse(result, 'Record created successfully');
  } catch (error) {
    logger.error('Database create error', error);
    if (error instanceof ValidationError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }
    return errorResponse('Failed to create record', 500, 'DATABASE_ERROR', {
      table,
      error: (error as Error).message,
    });
  }
}

/**
 * Update a record in a table
 */
export async function handleDatabaseUpdate(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { table, id } = params;

  try {
    const body = await request.json() as DatabaseRecord;

    if (!body || Object.keys(body).length === 0) {
      throw new ValidationError('Request body cannot be empty');
    }

    logger.info('Database update', { table, id, data: body });

    // Build UPDATE query
    const updates = Object.keys(body).map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(body), id];

    const query = `UPDATE ${table} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`;
    const result = await env.DB.prepare(query).bind(...values).first();

    if (!result) {
      throw new NotFoundError(`Record with id ${id} not found`);
    }

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['database-update'],
        indexes: [table],
      });
    }

    return jsonResponse(result, 'Record updated successfully');
  } catch (error) {
    logger.error('Database update error', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return errorResponse(error.message, error.statusCode, error.code, error.details);
    }
    return errorResponse('Failed to update record', 500, 'DATABASE_ERROR', {
      table,
      id,
      error: (error as Error).message,
    });
  }
}

/**
 * Delete a record from a table
 */
export async function handleDatabaseDelete(
  request: Request,
  env: Env,
  params: Record<string, string>
): Promise<Response> {
  const logger = new Logger(env);
  const { table, id } = params;

  try {
    logger.info('Database delete', { table, id });

    // Check if record exists
    const existingRecord = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ?`)
      .bind(id)
      .first();

    if (!existingRecord) {
      throw new NotFoundError(`Record with id ${id} not found`);
    }

    // Delete the record
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();

    // Track analytics if enabled
    if (env.FEATURE_ANALYTICS_ENABLED === 'true' && env.ANALYTICS) {
      env.ANALYTICS.writeDataPoint({
        blobs: ['database-delete'],
        indexes: [table],
      });
    }

    return noContentResponse();
  } catch (error) {
    logger.error('Database delete error', error);
    if (error instanceof NotFoundError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete record', 500, 'DATABASE_ERROR', {
      table,
      id,
      error: (error as Error).message,
    });
  }
}
