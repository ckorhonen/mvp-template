/**
 * D1 Database Service
 * Provides type-safe wrapper around Cloudflare D1 database
 * 
 * Features:
 * - Type-safe query builder
 * - Transaction support
 * - Prepared statements
 * - Error handling
 * - Query logging
 */

import type { Env } from '../types';

export interface QueryResult<T = any> {
  success: boolean;
  results: T[];
  meta?: {
    changed_db?: boolean;
    changes?: number;
    duration: number;
    last_row_id?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface WhereCondition {
  column: string;
  operator?: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN';
  value: any;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public query?: string,
    public params?: any[]
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Creates a D1 database service instance
 */
export function createD1Service(env: Env) {
  const db = env.DB;
  const logQueries = env.ENVIRONMENT === 'development';

  /**
   * Log query execution
   */
  function logQuery(query: string, params?: any[], duration?: number) {
    if (logQueries) {
      console.log('[D1]', {
        query,
        params,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  }

  /**
   * Execute a raw SQL query
   */
  async function query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    const startTime = Date.now();

    try {
      const stmt = params ? db.prepare(sql).bind(...params) : db.prepare(sql);
      const result = await stmt.all();

      const duration = Date.now() - startTime;
      logQuery(sql, params, duration);

      if (!result.success) {
        throw new DatabaseError('Query execution failed', 'QUERY_FAILED', sql, params);
      }

      return result.results as T[];
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logQuery(sql, params, duration);

      if (error instanceof DatabaseError) {
        throw error;
      }

      throw new DatabaseError(
        `Database error: ${error.message}`,
        'QUERY_ERROR',
        sql,
        params
      );
    }
  }

  /**
   * Execute a query and return first result
   */
  async function queryFirst<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null> {
    const results = await query<T>(sql, params);
    return results[0] || null;
  }

  /**
   * Execute a query and return single value
   */
  async function queryValue<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null> {
    const result = await queryFirst<any>(sql, params);
    if (!result) return null;
    const keys = Object.keys(result);
    return keys.length > 0 ? result[keys[0]] : null;
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE)
   */
  async function execute(
    sql: string,
    params?: any[]
  ): Promise<{
    success: boolean;
    changes: number;
    lastRowId: number | null;
  }> {
    const startTime = Date.now();

    try {
      const stmt = params ? db.prepare(sql).bind(...params) : db.prepare(sql);
      const result = await stmt.run();

      const duration = Date.now() - startTime;
      logQuery(sql, params, duration);

      return {
        success: result.success,
        changes: result.meta.changes || 0,
        lastRowId: result.meta.last_row_id || null,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logQuery(sql, params, duration);

      throw new DatabaseError(
        `Database error: ${error.message}`,
        'EXECUTE_ERROR',
        sql,
        params
      );
    }
  }

  /**
   * Insert a record
   */
  async function insert<T extends Record<string, any>>(
    table: string,
    data: T
  ): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await execute(sql, values);

    if (!result.lastRowId) {
      throw new DatabaseError('Insert failed: no last row ID', 'INSERT_FAILED');
    }

    return result.lastRowId;
  }

  /**
   * Update records
   */
  async function update<T extends Record<string, any>>(
    table: string,
    data: T,
    where: WhereCondition
  ): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col) => `${col} = ?`).join(', ');

    const operator = where.operator || '=';
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where.column} ${operator} ?`;

    const result = await execute(sql, [...values, where.value]);
    return result.changes;
  }

  /**
   * Delete records
   */
  async function deleteRecords(
    table: string,
    where: WhereCondition
  ): Promise<number> {
    const operator = where.operator || '=';
    const sql = `DELETE FROM ${table} WHERE ${where.column} ${operator} ?`;

    const result = await execute(sql, [where.value]);
    return result.changes;
  }

  /**
   * Count records
   */
  async function count(
    table: string,
    where?: WhereCondition
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    if (where) {
      const operator = where.operator || '=';
      sql += ` WHERE ${where.column} ${operator} ?`;
      params.push(where.value);
    }

    const result = await queryValue<number>(sql, params);
    return result || 0;
  }

  /**
   * Check if record exists
   */
  async function exists(
    table: string,
    where: WhereCondition
  ): Promise<boolean> {
    const cnt = await count(table, where);
    return cnt > 0;
  }

  /**
   * Execute queries in a batch
   */
  async function batch(queries: Array<{ sql: string; params?: any[] }>) {
    const statements = queries.map((q) => {
      const stmt = db.prepare(q.sql);
      return q.params ? stmt.bind(...q.params) : stmt;
    });

    const startTime = Date.now();

    try {
      const results = await db.batch(statements);
      const duration = Date.now() - startTime;

      if (logQueries) {
        console.log('[D1] Batch execution', {
          queries: queries.length,
          duration: `${duration}ms`,
        });
      }

      return results;
    } catch (error: any) {
      throw new DatabaseError(
        `Batch execution error: ${error.message}`,
        'BATCH_ERROR'
      );
    }
  }

  /**
   * Execute a function within a transaction (simulated)
   * Note: D1 doesn't support true transactions yet, this is a wrapper for future compatibility
   */
  async function transaction<T>(
    fn: (tx: ReturnType<typeof createD1Service>) => Promise<T>
  ): Promise<T> {
    // For now, just execute the function
    // When D1 supports transactions, wrap in BEGIN/COMMIT
    try {
      return await fn(createD1Service(env));
    } catch (error) {
      // In future: ROLLBACK
      throw error;
    }
  }

  return {
    query,
    queryFirst,
    queryValue,
    execute,
    insert,
    update,
    delete: deleteRecords,
    count,
    exists,
    batch,
    transaction,
    raw: db, // Access to raw D1 instance
  };
}

export type D1Service = ReturnType<typeof createD1Service>;
