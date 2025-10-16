/**
 * D1 Database Service
 * Provides utilities for interacting with Cloudflare D1 databases
 * with proper error handling, query building, and TypeScript types
 */

import type { Env } from '../types';

export interface QueryResult<T = any> {
  success: boolean;
  results?: T[];
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Database Service for D1
 */
export class DatabaseService {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.db = env.DB;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      const result = await stmt.all();

      return {
        success: result.success,
        results: result.results as T[],
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Execute a query and return first result
   */
  async queryFirst<T = any>(
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.results?.[0] || null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      const result = await stmt.run();

      return {
        success: result.success,
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database execute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<QueryResult[]> {
    try {
      const preparedStatements = statements.map((stmt) =>
        this.db.prepare(stmt.sql).bind(...(stmt.params || []))
      );

      const results = await this.db.batch(preparedStatements);

      return results.map((result) => ({
        success: result.success,
        results: result.results,
        meta: result.meta,
      }));
    } catch (error) {
      console.error('Database batch error:', error);
      throw error;
    }
  }

  /**
   * Get paginated results
   */
  async paginate<T>(
    sql: string,
    params: any[] = [],
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const page = options.page || 1;
    const perPage = options.perPage || 10;
    const offset = (page - 1) * perPage;

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
    const countResult = await this.queryFirst<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // Get paginated results
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const result = await this.query<T>(paginatedSql, [...params, perPage, offset]);

    const totalPages = Math.ceil(total / perPage);

    return {
      data: result.results || [],
      pagination: {
        total,
        page,
        perPage,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Insert a record and return the inserted ID
   */
  async insert(
    table: string,
    data: Record<string, any>
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      const result = await this.execute(sql, values);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Get last inserted ID
      const lastIdResult = await this.queryFirst<{ id: number }>(
        'SELECT last_insert_rowid() as id'
      );

      return {
        success: true,
        id: lastIdResult?.id,
      };
    } catch (error) {
      console.error('Database insert error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown insert error',
      };
    }
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<QueryResult> {
    try {
      const setClause = Object.keys(data)
        .map((key) => `${key} = ?`)
        .join(', ');

      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');

      const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      const params = [...Object.values(data), ...Object.values(where)];

      return await this.execute(sql, params);
    } catch (error) {
      console.error('Database update error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown update error',
      };
    }
  }

  /**
   * Delete records
   */
  async delete(
    table: string,
    where: Record<string, any>
  ): Promise<QueryResult> {
    try {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');

      const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
      const params = Object.values(where);

      return await this.execute(sql, params);
    } catch (error) {
      console.error('Database delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delete error',
      };
    }
  }

  /**
   * Find records by criteria
   */
  async find<T>(
    table: string,
    where?: Record<string, any>,
    options?: { orderBy?: string; limit?: number; offset?: number }
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const whereClause = Object.keys(where)
        .map((key) => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(where));
    }

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    const result = await this.query<T>(sql, params);
    return result.results || [];
  }

  /**
   * Find a single record by ID
   */
  async findById<T>(
    table: string,
    id: number | string,
    idColumn: string = 'id'
  ): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE ${idColumn} = ? LIMIT 1`;
    return await this.queryFirst<T>(sql, [id]);
  }

  /**
   * Check if a record exists
   */
  async exists(
    table: string,
    where: Record<string, any>
  ): Promise<boolean> {
    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(' AND ');

    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;
    const result = await this.queryFirst<{ count: number }>(sql, Object.values(where));

    return (result?.count || 0) > 0;
  }
}

/**
 * Create a database service instance
 */
export function createDatabaseService(env: Env): DatabaseService {
  return new DatabaseService(env);
}
