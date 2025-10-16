/**
 * D1 Database Utility Functions
 * Helpers for working with Cloudflare D1 databases
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types';

/**
 * Execute a query with parameters and return results
 */
export async function executeQuery<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await db.prepare(query).bind(...params).all();
  return result.results as T[];
}

/**
 * Execute a query and return the first result
 */
export async function executeQueryFirst<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const result = await db.prepare(query).bind(...params).first();
  return result as T | null;
}

/**
 * Execute a query and return a single value
 */
export async function executeQueryRaw<T = unknown>(
  db: D1Database,
  query: string,
  params: unknown[] = []
): Promise<T | null> {
  const result = await db.prepare(query).bind(...params).raw();
  return (result[0]?.[0] as T) ?? null;
}

/**
 * Execute multiple queries in a batch
 */
export async function executeBatch(
  db: D1Database,
  queries: Array<{ query: string; params?: unknown[] }>
): Promise<D1Result[]> {
  const statements = queries.map(({ query, params = [] }) =>
    db.prepare(query).bind(...params)
  );
  return await db.batch(statements);
}

/**
 * Run a migration (multiple statements)
 */
export async function runMigration(
  db: D1Database,
  statements: string[]
): Promise<void> {
  for (const statement of statements) {
    await db.exec(statement);
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(
  db: D1Database,
  tableName: string
): Promise<boolean> {
  const result = await executeQueryFirst<{ count: number }>(
    db,
    `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
    [tableName]
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Paginated query helper
 */
export async function executePaginatedQuery<T = unknown>(
  db: D1Database,
  baseQuery: string,
  params: unknown[] = [],
  page: number = 1,
  pageSize: number = 10
): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM (${baseQuery})`;
  const countResult = await executeQueryFirst<{ count: number }>(
    db,
    countQuery,
    params
  );
  const total = countResult?.count ?? 0;

  // Get paginated data
  const offset = (page - 1) * pageSize;
  const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`;
  const data = await executeQuery<T>(db, paginatedQuery, [
    ...params,
    pageSize,
    offset,
  ]);

  return { data, total, page, pageSize };
}
