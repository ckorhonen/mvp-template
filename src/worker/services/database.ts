/**
 * D1 Database Service
 * 
 * Provides utilities for interacting with Cloudflare D1 databases
 */

import { D1Database } from '@cloudflare/workers-types';

export interface QueryResult<T = any> {
  success: boolean;
  results?: T[];
  meta?: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export class DatabaseService {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Execute a single query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      return {
        success: result.success,
        results: result.results as T[],
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      return result as T | null;
    } catch (error) {
      console.error('Database queryFirst error:', error);
      throw new Error(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a batch of queries in a transaction
   */
  async batch(queries: { sql: string; params?: any[] }[]): Promise<QueryResult[]> {
    try {
      const statements = queries.map(({ sql, params = [] }) =>
        this.db.prepare(sql).bind(...params)
      );
      const results = await this.db.batch(statements);
      return results.map((result) => ({
        success: result.success,
        results: result.results,
        meta: result.meta,
      }));
    } catch (error) {
      console.error('Database batch error:', error);
      throw new Error(
        `Batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a query that modifies data (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<QueryResult> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return {
        success: result.success,
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database execute error:', error);
      throw new Error(
        `Execute failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all results from a query
   */
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.results || [];
  }

  /**
   * Count rows matching a query
   */
  async count(table: string, where?: string, params: any[] = []): Promise<number> {
    const sql = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    const result = await this.queryFirst<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Check if a record exists
   */
  async exists(table: string, where: string, params: any[] = []): Promise<boolean> {
    const count = await this.count(table, where, params);
    return count > 0;
  }
}
