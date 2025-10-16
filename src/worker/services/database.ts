/**
 * Database Service - D1 Database Utilities
 * 
 * Provides a type-safe wrapper around Cloudflare D1 with common database operations,
 * query builders, and transaction support.
 */

import { Env } from '../types';

export interface QueryResult<T = any> {
  success: boolean;
  results: T[];
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface DatabaseConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'DATABASE_ERROR',
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Database Service Class
 * Provides a high-level interface for D1 database operations
 */
export class DatabaseService {
  private readonly db: D1Database;
  private readonly config: DatabaseConfig;

  constructor(env: Env, config: DatabaseConfig = {}) {
    if (!env.DB) {
      throw new DatabaseError(
        'D1 database binding not configured',
        500,
        'MISSING_DATABASE_BINDING',
      );
    }

    this.db = env.DB;
    this.config = {
      enableLogging: config.enableLogging ?? false,
      enableMetrics: config.enableMetrics ?? true,
    };
  }

  /**
   * Execute a single query
   */
  async query<T = any>(
    sql: string,
    params: any[] = [],
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      if (this.config.enableLogging) {
        console.log('Executing query:', sql, params);
      }

      const result = await this.db.prepare(sql).bind(...params).all();

      const duration = Date.now() - startTime;

      if (this.config.enableLogging) {
        console.log(`Query completed in ${duration}ms`);
      }

      return {
        success: result.success,
        results: (result.results as T[]) || [],
        meta: result.meta
          ? {
              duration,
              rows_read: result.meta.rows_read || 0,
              rows_written: result.meta.rows_written || 0,
            }
          : undefined,
      };
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'QUERY_FAILED',
      );
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      return (result as T) || null;
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'QUERY_FAILED',
      );
    }
  }

  /**
   * Execute a query without returning results (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<D1Result> {
    try {
      if (this.config.enableLogging) {
        console.log('Executing statement:', sql, params);
      }

      return await this.db.prepare(sql).bind(...params).run();
    } catch (error) {
      throw new DatabaseError(
        `Execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'EXECUTE_FAILED',
      );
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: { sql: string; params?: any[] }[]): Promise<D1Result[]> {
    try {
      const prepared = statements.map((stmt) =>
        this.db.prepare(stmt.sql).bind(...(stmt.params || [])),
      );

      return await this.db.batch(prepared);
    } catch (error) {
      throw new DatabaseError(
        `Batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'BATCH_FAILED',
      );
    }
  }

  /**
   * Simple SELECT query builder
   */
  select<T = any>(table: string, where?: Record<string, any>): QueryBuilder<T> {
    return new QueryBuilder<T>(this, table, where);
  }

  /**
   * Simple INSERT operation
   */
  async insert(
    table: string,
    data: Record<string, any>,
  ): Promise<{ id?: number; changes: number }> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    try {
      const result = await this.execute(sql, values);
      return {
        id: result.meta?.last_row_id,
        changes: result.meta?.changes || 0,
      };
    } catch (error) {
      throw new DatabaseError(
        `Insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'INSERT_FAILED',
      );
    }
  }

  /**
   * Simple UPDATE operation
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
  ): Promise<{ changes: number }> {
    const setClause = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const params = [...Object.values(data), ...Object.values(where)];

    try {
      const result = await this.execute(sql, params);
      return { changes: result.meta?.changes || 0 };
    } catch (error) {
      throw new DatabaseError(
        `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'UPDATE_FAILED',
      );
    }
  }

  /**
   * Simple DELETE operation
   */
  async delete(
    table: string,
    where: Record<string, any>,
  ): Promise<{ changes: number }> {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    const params = Object.values(where);

    try {
      const result = await this.execute(sql, params);
      return { changes: result.meta?.changes || 0 };
    } catch (error) {
      throw new DatabaseError(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
        'DELETE_FAILED',
      );
    }
  }
}

/**
 * Query Builder for more complex queries
 */
class QueryBuilder<T> {
  private selectFields = '*';
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByClause = '';
  private limitValue?: number;
  private offsetValue?: number;

  constructor(
    private db: DatabaseService,
    private table: string,
    where?: Record<string, any>,
  ) {
    if (where) {
      this.where(where);
    }
  }

  fields(fields: string[]): this {
    this.selectFields = fields.join(', ');
    return this;
  }

  where(conditions: Record<string, any>): this {
    Object.entries(conditions).forEach(([key, value]) => {
      this.whereConditions.push(`${key} = ?`);
      this.whereParams.push(value);
    });
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = ` ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): this {
    this.offsetValue = offset;
    return this;
  }

  private buildQuery(): { sql: string; params: any[] } {
    let sql = `SELECT ${this.selectFields} FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    sql += this.orderByClause;

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params: this.whereParams };
  }

  async all(): Promise<T[]> {
    const { sql, params } = this.buildQuery();
    const result = await this.db.query<T>(sql, params);
    return result.results;
  }

  async first(): Promise<T | null> {
    const { sql, params } = this.buildQuery();
    return await this.db.queryFirst<T>(sql, params);
  }
}

/**
 * Helper function to create a database service instance
 */
export function createDatabaseService(
  env: Env,
  config?: DatabaseConfig,
): DatabaseService {
  return new DatabaseService(env, config);
}
