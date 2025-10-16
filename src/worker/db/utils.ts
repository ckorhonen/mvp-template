/**
 * Database Utility Functions
 * 
 * Provides helpers for working with Cloudflare D1 databases.
 */

import type { D1Database } from '@cloudflare/workers-types';

/**
 * Database Error
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Query result interface
 */
export interface QueryResult<T = any> {
  results: T[];
  success: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

/**
 * Database wrapper with utility methods
 */
export class Database {
  constructor(private db: D1Database) {}

  /**
   * Execute a query with parameters
   */
  async query<T = any>(sql: string, ...params: any[]): Promise<QueryResult<T>> {
    try {
      const stmt = this.db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.all();
      
      return {
        results: result.results as T[],
        success: result.success,
        meta: result.meta,
      };
    } catch (error) {
      throw new DatabaseError(
        'Query execution failed',
        'QUERY_ERROR',
        error
      );
    }
  }

  /**
   * Get a single row
   */
  async queryOne<T = any>(sql: string, ...params: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, ...params);
    return result.results[0] || null;
  }

  /**
   * Execute a mutation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, ...params: any[]): Promise<{ success: boolean; meta?: any }> {
    try {
      const stmt = this.db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.run();
      
      return {
        success: result.success,
        meta: result.meta,
      };
    } catch (error) {
      throw new DatabaseError(
        'Execute operation failed',
        'EXECUTE_ERROR',
        error
      );
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<any[]> {
    try {
      const prepared = statements.map(({ sql, params = [] }) => {
        const stmt = this.db.prepare(sql);
        return params.length > 0 ? stmt.bind(...params) : stmt;
      });
      
      return await this.db.batch(prepared);
    } catch (error) {
      throw new DatabaseError(
        'Batch operation failed',
        'BATCH_ERROR',
        error
      );
    }
  }

  /**
   * Run migration file
   */
  async runMigration(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await this.execute(statement);
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?",
      tableName
    );
    return (result?.count ?? 0) > 0;
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string): Promise<any[]> {
    const result = await this.query(
      'PRAGMA table_info(?)',
      tableName
    );
    return result.results;
  }
}

/**
 * Query builder for common operations
 */
export class QueryBuilder {
  private table: string;
  private whereConditions: string[] = [];
  private whereParams: any[] = [];
  private orderByClause: string = '';
  private limitValue?: number;
  private offsetValue?: number;

  constructor(table: string) {
    this.table = table;
  }

  where(condition: string, ...params: any[]): this {
    this.whereConditions.push(condition);
    this.whereParams.push(...params);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  buildSelect(columns: string[] = ['*']): { sql: string; params: any[] } {
    let sql = `SELECT ${columns.join(', ')} FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    if (this.orderByClause) {
      sql += ` ${this.orderByClause}`;
    }

    if (this.limitValue !== undefined) {
      sql += ` LIMIT ${this.limitValue}`;
    }

    if (this.offsetValue !== undefined) {
      sql += ` OFFSET ${this.offsetValue}`;
    }

    return { sql, params: this.whereParams };
  }

  buildDelete(): { sql: string; params: any[] } {
    let sql = `DELETE FROM ${this.table}`;

    if (this.whereConditions.length > 0) {
      sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
    }

    return { sql, params: this.whereParams };
  }
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
export function currentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Paginate results
 */
export interface PaginationParams {
  page?: number;
  perPage?: number;
  maxPerPage?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginate<T>(
  db: Database,
  sql: string,
  countSql: string,
  params: any[],
  options: PaginationParams = {}
): Promise<PaginationResult<T>> {
  const page = Math.max(1, options.page || 1);
  const maxPerPage = options.maxPerPage || 100;
  const perPage = Math.min(maxPerPage, Math.max(1, options.perPage || 20));
  const offset = (page - 1) * perPage;

  // Get total count
  const countResult = await db.queryOne<{ count: number }>(countSql, ...params);
  const total = countResult?.count || 0;
  const totalPages = Math.ceil(total / perPage);

  // Get paginated data
  const paginatedSql = `${sql} LIMIT ${perPage} OFFSET ${offset}`;
  const result = await db.query<T>(paginatedSql, ...params);

  return {
    data: result.results,
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
