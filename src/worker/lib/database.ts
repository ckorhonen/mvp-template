/**
 * Cloudflare D1 Database Utilities
 * 
 * This module provides helper functions for working with D1 databases.
 * D1 is Cloudflare's serverless SQL database built on SQLite.
 */

import { D1Database } from '@cloudflare/workers-types';

export interface QueryResult<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export class DatabaseClient {
  constructor(private db: D1Database) {}

  /**
   * Execute a query with parameters (prevents SQL injection)
   */
  async query<T = unknown>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      const result = await stmt.all();
      return result as QueryResult<T>;
    } catch (error) {
      console.error('Database query error:', error);
      throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryFirst<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.results[0] || null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: unknown[] = []): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      return await stmt.run();
    } catch (error) {
      console.error('Database execute error:', error);
      throw new Error(`Database execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  async batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<D1Result[]> {
    try {
      const stmts = statements.map(({ sql, params = [] }) =>
        this.db.prepare(sql).bind(...params),
      );
      return await this.db.batch(stmts);
    } catch (error) {
      console.error('Database batch error:', error);
      throw new Error(`Database batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName],
    );
    return result.results.length > 0;
  }

  /**
   * Get table schema information
   */
  async getTableInfo(tableName: string) {
    return await this.query(`PRAGMA table_info(${tableName})`);
  }
}

/**
 * Database migration utilities
 */
export class MigrationRunner {
  constructor(private db: DatabaseClient) {}

  /**
   * Run database migrations
   */
  async runMigrations(migrations: Array<{ version: number; sql: string }>) {
    // Create migrations table if it doesn't exist
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const applied = await this.db.query<{ version: number }>(
      'SELECT version FROM migrations ORDER BY version',
    );
    const appliedVersions = new Set(applied.results.map((r) => r.version));

    // Run pending migrations
    for (const migration of migrations.sort((a, b) => a.version - b.version)) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`Running migration ${migration.version}`);
        await this.db.execute(migration.sql);
        await this.db.execute('INSERT INTO migrations (version) VALUES (?)', [
          migration.version,
        ]);
        console.log(`Migration ${migration.version} completed`);
      }
    }
  }
}

// Type for D1 execute result
interface D1Result {
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
    last_row_id: number;
    changes: number;
  };
}
