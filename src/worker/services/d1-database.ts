/**
 * D1 Database Service
 * Provides type-safe database operations for Cloudflare D1
 */

import type { Env } from '../types';

export interface QueryResult<T = unknown> {
  results: T[];
  success: boolean;
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface WhereClause {
  column: string;
  operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: string | number | boolean | null | (string | number)[];
}

export class D1DatabaseService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = unknown>(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all();

      if (!result.success) {
        throw new Error('Database query failed');
      }

      return result.results as T[];
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute a single query and return first result
   */
  async queryOne<T = unknown>(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  /**
   * Execute a query without returning results (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params: (string | number | boolean | null)[] = []
  ): Promise<{ success: boolean; meta?: Record<string, unknown> }> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return {
        success: result.success,
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database execute error:', error);
      throw error;
    }
  }

  /**
   * Insert a record into a table
   */
  async insert(
    table: string,
    data: Record<string, string | number | boolean | null>
  ): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const result = await this.db.prepare(sql).bind(...values).run();

    if (!result.success) {
      throw new Error('Failed to insert record');
    }

    // Return the last inserted ID
    return result.meta?.last_row_id as number;
  }

  /**
   * Update records in a table
   */
  async update(
    table: string,
    data: Record<string, string | number | boolean | null>,
    where: WhereClause
  ): Promise<number> {
    const updates = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(data), where.value];

    const operator = where.operator || '=';
    const sql = `
      UPDATE ${table}
      SET ${updates}
      WHERE ${where.column} ${operator} ?
    `;

    const result = await this.db.prepare(sql).bind(...values).run();

    if (!result.success) {
      throw new Error('Failed to update record');
    }

    return result.meta?.changes as number;
  }

  /**
   * Delete records from a table
   */
  async delete(table: string, where: WhereClause): Promise<number> {
    const operator = where.operator || '=';
    const sql = `
      DELETE FROM ${table}
      WHERE ${where.column} ${operator} ?
    `;

    const result = await this.db.prepare(sql).bind(where.value).run();

    if (!result.success) {
      throw new Error('Failed to delete record');
    }

    return result.meta?.changes as number;
  }

  /**
   * Select records with pagination
   */
  async select<T = unknown>(
    table: string,
    options?: {
      columns?: string[];
      where?: WhereClause[];
      orderBy?: { column: string; direction: 'ASC' | 'DESC' };
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    const columns = options?.columns?.join(', ') || '*';
    let sql = `SELECT ${columns} FROM ${table}`;
    const params: (string | number | boolean | null)[] = [];

    // Add WHERE clauses
    if (options?.where && options.where.length > 0) {
      const whereClauses = options.where.map((w) => {
        const operator = w.operator || '=';
        if (operator === 'IN' && Array.isArray(w.value)) {
          const placeholders = w.value.map(() => '?').join(', ');
          params.push(...w.value);
          return `${w.column} IN (${placeholders})`;
        }
        params.push(w.value as string | number | boolean | null);
        return `${w.column} ${operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy.column} ${options.orderBy.direction}`;
    }

    // Add LIMIT and OFFSET
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    return this.query<T>(sql, params);
  }

  /**
   * Count records in a table
   */
  async count(
    table: string,
    where?: WhereClause[]
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: (string | number | boolean | null)[] = [];

    if (where && where.length > 0) {
      const whereClauses = where.map((w) => {
        const operator = w.operator || '=';
        params.push(w.value as string | number | boolean | null);
        return `${w.column} ${operator} ?`;
      });
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await this.queryOne<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(
    queries: Array<{
      sql: string;
      params?: (string | number | boolean | null)[];
    }>
  ): Promise<void> {
    try {
      const statements = queries.map((q) =>
        this.db.prepare(q.sql).bind(...(q.params || []))
      );

      await this.db.batch(statements);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.queryOne<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return result !== null;
  }
}

/**
 * Factory function to create D1 database service
 */
export function createD1Service(env: Env): D1DatabaseService {
  return new D1DatabaseService(env);
}
