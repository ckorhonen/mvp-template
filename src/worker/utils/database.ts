import { Env, D1Result, WorkerError } from '../types';

/**
 * D1 Database utility functions
 * https://developers.cloudflare.com/d1/
 */

export class Database {
  constructor(private db: D1Database) {}

  /**
   * Execute a query and return results
   */
  async query<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T[]> {
    try {
      const stmt = params ? this.db.prepare(sql).bind(...params) : this.db.prepare(sql);
      const result = await stmt.all<T>();
      
      if (!result.success) {
        throw new WorkerError(
          'Database query failed',
          500,
          'DB_QUERY_ERROR',
          { sql, error: result.error }
        );
      }

      return result.results || [];
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw new WorkerError(
        'Database query execution failed',
        500,
        'DB_EXECUTION_ERROR',
        { sql, originalError: error }
      );
    }
  }

  /**
   * Execute a query and return first result
   */
  async queryOne<T = any>(
    sql: string,
    params?: any[]
  ): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute an INSERT/UPDATE/DELETE statement
   */
  async execute(
    sql: string,
    params?: any[]
  ): Promise<D1ExecResult> {
    try {
      const stmt = params ? this.db.prepare(sql).bind(...params) : this.db.prepare(sql);
      const result = await stmt.run();
      
      if (!result.success) {
        throw new WorkerError(
          'Database execution failed',
          500,
          'DB_EXECUTE_ERROR',
          { sql }
        );
      }

      return result;
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw new WorkerError(
        'Database statement execution failed',
        500,
        'DB_STATEMENT_ERROR',
        { sql, originalError: error }
      );
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(
    statements: Array<{ sql: string; params?: any[] }>
  ): Promise<D1ExecResult[]> {
    try {
      const stmts = statements.map(({ sql, params }) => 
        params ? this.db.prepare(sql).bind(...params) : this.db.prepare(sql)
      );
      
      const results = await this.db.batch(stmts);
      return results;
    } catch (error) {
      throw new WorkerError(
        'Database batch execution failed',
        500,
        'DB_BATCH_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result !== null;
  }

  /**
   * Get table row count
   */
  async getCount(tableName: string, where?: string, params?: any[]): Promise<number> {
    const sql = where 
      ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${tableName}`;
    
    const result = await this.queryOne<{ count: number }>(sql, params);
    return result?.count || 0;
  }
}

/**
 * Database migration helper
 */
export class DatabaseMigration {
  constructor(private db: D1Database) {}

  /**
   * Initialize migrations table
   */
  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Check if migration has been run
   */
  async hasRun(name: string): Promise<boolean> {
    const database = new Database(this.db);
    const result = await database.queryOne<{ name: string }>(
      'SELECT name FROM _migrations WHERE name = ?',
      [name]
    );
    return result !== null;
  }

  /**
   * Record migration as executed
   */
  async recordMigration(name: string): Promise<void> {
    const database = new Database(this.db);
    await database.execute(
      'INSERT INTO _migrations (name) VALUES (?)',
      [name]
    );
  }
}
