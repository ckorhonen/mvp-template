/**
 * D1 Database Utilities
 * Helper functions for working with Cloudflare D1
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { PaginatedResponse, PaginationParams } from '../types/database.types';
import { logError, logDebug } from './logger';

// ===========================================
// Query Builders
// ===========================================

/**
 * Execute a query with error handling
 */
export async function executeQuery<T = any>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T[]> {
  try {
    logDebug('Executing query', { query, params });
    const result = await db.prepare(query).bind(...params).all<T>();
    return result.results || [];
  } catch (error: any) {
    logError('Database query failed', error, { query, params });
    throw new DatabaseError('Query execution failed', error);
  }
}

/**
 * Execute a query and return first result
 */
export async function executeQueryOne<T = any>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T | null> {
  try {
    logDebug('Executing query (one)', { query, params });
    const result = await db.prepare(query).bind(...params).first<T>();
    return result;
  } catch (error: any) {
    logError('Database query failed', error, { query, params });
    throw new DatabaseError('Query execution failed', error);
  }
}

/**
 * Execute a write operation (INSERT, UPDATE, DELETE)
 */
export async function executeWrite(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<{ success: boolean; changes: number; lastRowId: number }> {
  try {
    logDebug('Executing write', { query, params });
    const result = await db.prepare(query).bind(...params).run();
    return {
      success: result.success,
      changes: result.meta.changes,
      lastRowId: result.meta.last_row_id,
    };
  } catch (error: any) {
    logError('Database write failed', error, { query, params });
    throw new DatabaseError('Write operation failed', error);
  }
}

/**
 * Execute multiple statements in a transaction
 */
export async function executeTransaction(
  db: D1Database,
  statements: Array<{ query: string; params?: any[] }>
): Promise<boolean> {
  try {
    logDebug('Executing transaction', { statementCount: statements.length });

    const preparedStatements = statements.map(stmt =>
      db.prepare(stmt.query).bind(...(stmt.params || []))
    );

    const results = await db.batch(preparedStatements);

    // Check if all statements succeeded
    const allSucceeded = results.every(r => r.success);

    if (!allSucceeded) {
      throw new Error('One or more statements in transaction failed');
    }

    return true;
  } catch (error: any) {
    logError('Transaction failed', error, { statementCount: statements.length });
    throw new DatabaseError('Transaction failed', error);
  }
}

// ===========================================
// Pagination Helpers
// ===========================================

/**
 * Execute a paginated query
 */
export async function executePaginated<T = any>(
  db: D1Database,
  baseQuery: string,
  params: any[] = [],
  pagination: PaginationParams = {}
): Promise<PaginatedResponse<T>> {
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 10, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery})`;
  const countResult = await executeQueryOne<{ total: number }>(db, countQuery, params);
  const total = countResult?.total || 0;

  // Get paginated results
  const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
  const results = await executeQuery<T>(db, paginatedQuery, [...params, limit, offset]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: results,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ===========================================
// CRUD Helpers
// ===========================================

/**
 * Insert a record and return the ID
 */
export async function insert(
  db: D1Database,
  table: string,
  data: Record<string, any>
): Promise<string> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');

  const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const result = await executeWrite(db, query, values);

  return result.lastRowId.toString();
}

/**
 * Update a record by ID
 */
export async function update(
  db: D1Database,
  table: string,
  id: string | number,
  data: Record<string, any>
): Promise<boolean> {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map(key => `${key} = ?`).join(', ');

  const query = `UPDATE ${table} SET ${setClause}, updated_at = unixepoch() WHERE id = ?`;
  const result = await executeWrite(db, query, [...values, id]);

  return result.changes > 0;
}

/**
 * Delete a record by ID
 */
export async function deleteById(
  db: D1Database,
  table: string,
  id: string | number
): Promise<boolean> {
  const query = `DELETE FROM ${table} WHERE id = ?`;
  const result = await executeWrite(db, query, [id]);

  return result.changes > 0;
}

/**
 * Find a record by ID
 */
export async function findById<T>(
  db: D1Database,
  table: string,
  id: string | number
): Promise<T | null> {
  const query = `SELECT * FROM ${table} WHERE id = ? LIMIT 1`;
  return executeQueryOne<T>(db, query, [id]);
}

/**
 * Find records by field
 */
export async function findBy<T>(
  db: D1Database,
  table: string,
  field: string,
  value: any
): Promise<T[]> {
  const query = `SELECT * FROM ${table} WHERE ${field} = ?`;
  return executeQuery<T>(db, query, [value]);
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Check if a record exists
 */
export async function exists(
  db: D1Database,
  table: string,
  field: string,
  value: any
): Promise<boolean> {
  const query = `SELECT 1 FROM ${table} WHERE ${field} = ? LIMIT 1`;
  const result = await executeQueryOne(db, query, [value]);
  return result !== null;
}

/**
 * Generate UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Sanitize SQL identifier (table or column name)
 */
export function sanitizeIdentifier(identifier: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

// ===========================================
// Error Classes
// ===========================================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class RecordNotFoundError extends Error {
  constructor(
    public table: string,
    public id: string | number
  ) {
    super(`Record not found in ${table} with id ${id}`);
    this.name = 'RecordNotFoundError';
  }
}
