/**
 * D1 Database Utilities
 * Provides type-safe database operations and common patterns
 */

import type { Env } from '../types';

export interface DatabaseResult<T = any> {
  success: boolean;
  results?: T[];
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

export class Database {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = any>(sql: string, params?: any[]): Promise<DatabaseResult<T>> {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? await stmt.bind(...params).all() : await stmt.all();
      
      return {
        success: result.success,
        results: result.results as T[],
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a single row query
   */
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.results?.[0] || null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params?: any[]): Promise<DatabaseResult> {
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? await stmt.bind(...params).run() : await stmt.run();
      
      return {
        success: result.success,
        meta: result.meta,
      };
    } catch (error) {
      console.error('Database execute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: { sql: string; params?: any[] }[]): Promise<DatabaseResult[]> {
    try {
      const stmts = statements.map((s) => {
        const stmt = this.db.prepare(s.sql);
        return s.params ? stmt.bind(...s.params) : stmt;
      });
      
      const results = await this.db.batch(stmts);
      
      return results.map((r) => ({
        success: r.success,
        results: r.results,
        meta: r.meta,
      }));
    } catch (error) {
      console.error('Database batch error:', error);
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ];
    }
  }

  /**
   * Insert a record and return the inserted ID
   */
  async insert(table: string, data: Record<string, any>): Promise<number | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(sql, values);
    
    if (!result.success) {
      return null;
    }
    
    // Get the last inserted row ID
    const lastId = await this.queryOne<{ id: number }>(
      'SELECT last_insert_rowid() as id'
    );
    
    return lastId?.id || null;
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: Record<string, any>,
    where: string,
    whereParams?: any[]
  ): Promise<boolean> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    const params = whereParams ? [...values, ...whereParams] : values;
    
    const result = await this.execute(sql, params);
    return result.success;
  }

  /**
   * Delete records
   */
  async delete(table: string, where: string, params?: any[]): Promise<boolean> {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    const result = await this.execute(sql, params);
    return result.success;
  }

  /**
   * Check if a record exists
   */
  async exists(table: string, where: string, params?: any[]): Promise<boolean> {
    const sql = `SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`;
    const result = await this.queryOne(sql, params);
    return result !== null;
  }

  /**
   * Count records
   */
  async count(table: string, where?: string, params?: any[]): Promise<number> {
    const sql = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    
    const result = await this.queryOne<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Find records with pagination
   */
  async findMany<T = any>(
    table: string,
    options?: {
      where?: string;
      params?: any[];
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    
    if (options?.where) {
      sql += ` WHERE ${options.where}`;
    }
    
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    
    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }
    
    const result = await this.query<T>(sql, options?.params);
    return result.results || [];
  }

  /**
   * Find a single record
   */
  async findOne<T = any>(
    table: string,
    where: string,
    params?: any[]
  ): Promise<T | null> {
    const sql = `SELECT * FROM ${table} WHERE ${where} LIMIT 1`;
    return await this.queryOne<T>(sql, params);
  }

  /**
   * Upsert (insert or update)
   */
  async upsert(
    table: string,
    data: Record<string, any>,
    conflictKeys: string[]
  ): Promise<boolean> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const updateClause = keys
      .filter((k) => !conflictKeys.includes(k))
      .map((k) => `${k} = excluded.${k}`)
      .join(', ');
    
    const sql = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${conflictKeys.join(', ')})
      DO UPDATE SET ${updateClause}
    `;
    
    const result = await this.execute(sql, values);
    return result.success;
  }
}

/**
 * Initialize database with schema
 */
export async function initializeDatabase(db: D1Database): Promise<void> {
  const database = new Database(db);
  
  // Create example tables
  await database.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await database.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  
  await database.execute(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status INTEGER NOT NULL,
      duration REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database initialized successfully');
}

/**
 * Create a database instance
 */
export function createDatabase(env: Env): Database {
  return new Database(env.DB);
}
