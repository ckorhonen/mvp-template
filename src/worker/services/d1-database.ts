/**
 * D1 Database Service
 * 
 * Type-safe wrapper for Cloudflare D1 database operations.
 * Includes query builders, transactions, and error handling.
 */

import type { Env } from '../types';

export interface D1QueryResult<T = unknown> {
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
  results: T[];
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export class D1DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * Execute a raw SQL query
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      return result.results as T[];
    } catch (error) {
      throw new Error(`D1 query failed: ${error}`);
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryOne<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      return result as T | null;
    } catch (error) {
      throw new Error(`D1 query failed: ${error}`);
    }
  }

  /**
   * Execute a query that modifies data (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: unknown[] = []): Promise<D1ExecResult> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return {
        count: result.meta.rows_written || 0,
        duration: result.meta.duration || 0,
      };
    } catch (error) {
      throw new Error(`D1 execution failed: ${error}`);
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch<T = unknown>(statements: { sql: string; params?: unknown[] }[]): Promise<D1QueryResult<T>[]> {
    try {
      const prepared = statements.map(({ sql, params = [] }) =>
        this.db.prepare(sql).bind(...params)
      );
      const results = await this.db.batch(prepared);
      return results as D1QueryResult<T>[];
    } catch (error) {
      throw new Error(`D1 batch execution failed: ${error}`);
    }
  }

  /**
   * Insert a record and return the inserted ID
   */
  async insert(table: string, data: Record<string, unknown>): Promise<number> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.db.prepare(sql).bind(...values).run();
    
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
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where.column} = ?`;
    const result = await this.db.prepare(sql).bind(...values, where.value).run();
    
    return result.meta.rows_written || 0;
  }

  /**
   * Delete records
   */
  async delete(table: string, where: { column: string; value: unknown }): Promise<number> {
    const sql = `DELETE FROM ${table} WHERE ${where.column} = ?`;
    const result = await this.db.prepare(sql).bind(where.value).run();
    
    return result.meta.rows_written || 0;
  }

  /**
   * Check if a record exists
   */
  async exists(table: string, where: { column: string; value: unknown }): Promise<boolean> {
    const sql = `SELECT 1 FROM ${table} WHERE ${where.column} = ? LIMIT 1`;
    const result = await this.db.prepare(sql).bind(where.value).first();
    return result !== null;
  }

  /**
   * Count records
   */
  async count(table: string, where?: { column: string; value: unknown }): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: unknown[] = [];
    
    if (where) {
      sql += ` WHERE ${where.column} = ?`;
      params.push(where.value);
    }
    
    const result = await this.queryOne<{ count: number }>(sql, params);
    return result?.count || 0;
  }
}

/**
 * Create a D1 database service instance from environment
 */
export function createD1Service(env: Env): D1DatabaseService {
  return new D1DatabaseService(env.DB);
}

/**
 * Example models and queries
 */
export const D1Examples = {
  // Create a user
  async createUser(db: D1DatabaseService, email: string, name: string) {
    const userId = await db.insert('users', {
      email,
      name,
      created_at: new Date().toISOString(),
    });
    return userId;
  },

  // Get user by email
  async getUserByEmail(db: D1DatabaseService, email: string) {
    return await db.queryOne(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  },

  // Update user
  async updateUser(db: D1DatabaseService, userId: number, data: Record<string, unknown>) {
    return await db.update('users', data, { column: 'id', value: userId });
  },

  // List users with pagination
  async listUsers(db: D1DatabaseService, page: number = 1, perPage: number = 10) {
    const offset = (page - 1) * perPage;
    return await db.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [perPage, offset]
    );
  },

  // Delete user
  async deleteUser(db: D1DatabaseService, userId: number) {
    return await db.delete('users', { column: 'id', value: userId });
  },
};
