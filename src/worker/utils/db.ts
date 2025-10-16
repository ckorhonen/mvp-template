/**
 * D1 database utilities
 * Provides type-safe database operations with error handling
 */

import { Logger } from './logger';

export interface QueryOptions {
  /** Bind parameters for prepared statements */
  params?: unknown[];
  /** Log the query */
  log?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * D1 Database Manager
 */
export class D1Manager {
  private db: D1Database;
  private logger?: Logger;

  constructor(db: D1Database, logger?: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Execute a query that returns multiple rows
   */
  async query<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    try {
      this.logger?.debug('Executing query', { sql, params });
      
      const result = await this.db.prepare(sql).bind(...params).all<T>();
      
      if (!result.success) {
        throw new Error('Query execution failed');
      }

      this.logger?.debug('Query executed successfully', { rowCount: result.results?.length });
      return result.results || [];
    } catch (error) {
      this.logger?.error('Query execution failed', error, { sql, params });
      throw error;
    }
  }

  /**
   * Execute a query that returns a single row
   */
  async queryOne<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    try {
      this.logger?.debug('Executing query (single)', { sql, params });
      
      const result = await this.db.prepare(sql).bind(...params).first<T>();
      
      this.logger?.debug('Query executed successfully', { found: result !== null });
      return result;
    } catch (error) {
      this.logger?.error('Query execution failed', error, { sql, params });
      throw error;
    }
  }

  /**
   * Execute a query that doesn't return data (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<D1Response> {
    try {
      this.logger?.debug('Executing statement', { sql, params });
      
      const result = await this.db.prepare(sql).bind(...params).run();
      
      if (!result.success) {
        throw new Error('Statement execution failed');
      }

      this.logger?.debug('Statement executed successfully', {
        changes: result.meta.changes,
        lastRowId: result.meta.last_row_id,
      });
      
      return result;
    } catch (error) {
      this.logger?.error('Statement execution failed', error, { sql, params });
      throw error;
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<D1Response[]> {
    try {
      this.logger?.debug('Executing batch', { count: statements.length });
      
      const prepared = statements.map((stmt) =>
        this.db.prepare(stmt.sql).bind(...(stmt.params || []))
      );
      
      const results = await this.db.batch(prepared);
      
      this.logger?.debug('Batch executed successfully', { count: results.length });
      return results;
    } catch (error) {
      this.logger?.error('Batch execution failed', error, { count: statements.length });
      throw error;
    }
  }

  /**
   * Execute a query with pagination
   */
  async queryPaginated<T = unknown>(
    sql: string,
    params: unknown[],
    pagination: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM (${sql})`;
    const countResult = await this.queryOne<{ count: number }>(countSql, params);
    const total = countResult?.count || 0;

    // Get paginated data
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const data = await this.query<T>(paginatedSql, [...params, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Insert a record and return the inserted ID
   */
  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<number> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(sql, values);
    
    return result.meta.last_row_id || 0;
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: Record<string, unknown>,
    where: { column: string; value: unknown }
  ): Promise<number> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const sets = keys.map((key) => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${sets} WHERE ${where.column} = ?`;
    const result = await this.execute(sql, [...values, where.value]);
    
    return result.meta.changes || 0;
  }

  /**
   * Delete records
   */
  async delete(
    table: string,
    where: { column: string; value: unknown }
  ): Promise<number> {
    const sql = `DELETE FROM ${table} WHERE ${where.column} = ?`;
    const result = await this.execute(sql, [where.value]);
    
    return result.meta.changes || 0;
  }
}

/**
 * Create a D1 manager instance
 */
export function createD1Manager(db: D1Database, logger?: Logger): D1Manager {
  return new D1Manager(db, logger);
}
