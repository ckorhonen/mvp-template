/**
 * Database Utility Functions
 * Helper functions for D1 database operations
 */

import { Env, DatabaseRecord } from '../types/env';
import { Logger } from './logger';

/**
 * Execute a prepared statement with error handling
 */
export async function executeQuery<T = any>(
  env: Env,
  query: string,
  params: any[] = []
): Promise<T[]> {
  const logger = new Logger(env);

  try {
    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).all();
    return result.results as T[];
  } catch (error) {
    logger.error('Database query error', error);
    throw error;
  }
}

/**
 * Execute a query and return the first result
 */
export async function executeQueryFirst<T = any>(
  env: Env,
  query: string,
  params: any[] = []
): Promise<T | null> {
  const logger = new Logger(env);

  try {
    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).first();
    return result as T | null;
  } catch (error) {
    logger.error('Database query error', error);
    throw error;
  }
}

/**
 * Execute a mutation query (INSERT, UPDATE, DELETE)
 */
export async function executeMutation(
  env: Env,
  query: string,
  params: any[] = []
): Promise<any> {
  const logger = new Logger(env);

  try {
    const stmt = env.DB.prepare(query);
    const result = await stmt.bind(...params).run();
    return result;
  } catch (error) {
    logger.error('Database mutation error', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a batch
 */
export async function executeBatch(
  env: Env,
  queries: Array<{ query: string; params: any[] }>
): Promise<any[]> {
  const logger = new Logger(env);

  try {
    const statements = queries.map(({ query, params }) =>
      env.DB.prepare(query).bind(...params)
    );
    const results = await env.DB.batch(statements);
    return results;
  } catch (error) {
    logger.error('Database batch error', error);
    throw error;
  }
}

/**
 * Check if a record exists
 */
export async function recordExists(
  env: Env,
  table: string,
  id: string | number
): Promise<boolean> {
  const result = await executeQueryFirst(
    env,
    `SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`,
    [id]
  );
  return result !== null;
}

/**
 * Get record count
 */
export async function getRecordCount(
  env: Env,
  table: string,
  whereClause?: string,
  params: any[] = []
): Promise<number> {
  const query = whereClause
    ? `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`
    : `SELECT COUNT(*) as count FROM ${table}`;
  
  const result = await executeQueryFirst<{ count: number }>(env, query, params);
  return result?.count || 0;
}

/**
 * Build INSERT query from object
 */
export function buildInsertQuery(
  table: string,
  data: Record<string, any>
): { query: string; params: any[] } {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const params = Object.values(data);

  return {
    query: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    params,
  };
}

/**
 * Build UPDATE query from object
 */
export function buildUpdateQuery(
  table: string,
  id: string | number,
  data: Record<string, any>
): { query: string; params: any[] } {
  const updates = Object.keys(data).map((key) => `${key} = ?`).join(', ');
  const params = [...Object.values(data), id];

  return {
    query: `UPDATE ${table} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`,
    params,
  };
}
