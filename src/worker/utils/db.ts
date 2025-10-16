/**
 * D1 Database utility functions
 */

import { D1Database, D1Result } from '@cloudflare/workers-types';
import { TypedD1Result, WhereClause, OrderBy } from '../types/d1';

/**
 * Execute a query with error handling
 */
export async function executeQuery<T>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<TypedD1Result<T>> {
  try {
    const result = await db.prepare(query).bind(...params).all();
    return result as TypedD1Result<T>;
  } catch (error) {
    console.error('Database query error:', error, { query, params });
    throw new Error('Database query failed');
  }
}

/**
 * Execute a query and return the first result
 */
export async function executeQueryOne<T>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T | null> {
  const result = await executeQuery<T>(db, query, params);
  return result.results.length > 0 ? result.results[0] : null;
}

/**
 * Insert a record and return the inserted ID
 */
export async function insert(
  db: D1Database,
  table: string,
  data: Record<string, any>
): Promise<number> {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => '?').join(', ');

  const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
  const result = await db.prepare(query).bind(...values).run();

  if (!result.success) {
    throw new Error(`Failed to insert into ${table}`);
  }

  return result.meta.last_row_id;
}

/**
 * Update records matching conditions
 */
export async function update(
  db: D1Database,
  table: string,
  data: Record<string, any>,
  where: WhereClause[]
): Promise<number> {
  const setClause = Object.keys(data)
    .map(key => `${key} = ?`)
    .join(', ');

  const whereClause = where
    .map(w => `${w.field} ${w.operator} ?`)
    .join(' AND ');

  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const params = [...Object.values(data), ...where.map(w => w.value)];

  const result = await db.prepare(query).bind(...params).run();
  return result.meta.changes || 0;
}

/**
 * Delete records matching conditions
 */
export async function deleteRecords(
  db: D1Database,
  table: string,
  where: WhereClause[]
): Promise<number> {
  const whereClause = where
    .map(w => `${w.field} ${w.operator} ?`)
    .join(' AND ');

  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  const params = where.map(w => w.value);

  const result = await db.prepare(query).bind(...params).run();
  return result.meta.changes || 0;
}

/**
 * Find records with pagination
 */
export async function find<T>(
  db: D1Database,
  table: string,
  where: WhereClause[] = [],
  orderBy?: OrderBy,
  limit?: number,
  offset?: number
): Promise<T[]> {
  let query = `SELECT * FROM ${table}`;
  const params: any[] = [];

  if (where.length > 0) {
    const whereClause = where
      .map(w => `${w.field} ${w.operator} ?`)
      .join(' AND ');
    query += ` WHERE ${whereClause}`;
    params.push(...where.map(w => w.value));
  }

  if (orderBy) {
    query += ` ORDER BY ${orderBy.field} ${orderBy.direction}`;
  }

  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  if (offset) {
    query += ` OFFSET ?`;
    params.push(offset);
  }

  const result = await executeQuery<T>(db, query, params);
  return result.results;
}

/**
 * Find a single record by ID
 */
export async function findById<T>(
  db: D1Database,
  table: string,
  id: number
): Promise<T | null> {
  const query = `SELECT * FROM ${table} WHERE id = ? LIMIT 1`;
  return executeQueryOne<T>(db, query, [id]);
}

/**
 * Count records matching conditions
 */
export async function count(
  db: D1Database,
  table: string,
  where: WhereClause[] = []
): Promise<number> {
  let query = `SELECT COUNT(*) as count FROM ${table}`;
  const params: any[] = [];

  if (where.length > 0) {
    const whereClause = where
      .map(w => `${w.field} ${w.operator} ?`)
      .join(' AND ');
    query += ` WHERE ${whereClause}`;
    params.push(...where.map(w => w.value));
  }

  const result = await executeQueryOne<{ count: number }>(db, query, params);
  return result?.count || 0;
}

/**
 * Execute a transaction
 */
export async function transaction(
  db: D1Database,
  queries: { query: string; params: any[] }[]
): Promise<D1Result[]> {
  const batch = queries.map(q => db.prepare(q.query).bind(...q.params));
  return await db.batch(batch);
}

/**
 * Soft delete a record (set deleted_at timestamp)
 */
export async function softDelete(
  db: D1Database,
  table: string,
  id: number
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const changes = await update(
    db,
    table,
    { deleted_at: now },
    [{ field: 'id', operator: '=', value: id }]
  );
  return changes > 0;
}
