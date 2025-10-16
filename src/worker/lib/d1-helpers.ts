/**
 * D1 Database Helper Functions
 * Provides typed database operations and migrations
 */

import { D1Database, D1Result } from '@cloudflare/workers-types';

export interface QueryOptions {
  params?: unknown[];
  throwOnError?: boolean;
}

export class D1Helper {
  constructor(private db: D1Database) {}

  /**
   * Execute a query with parameters
   */
  async query<T = unknown>(
    sql: string,
    options: QueryOptions = {},
  ): Promise<D1Result<T>> {
    try {
      const stmt = options.params
        ? this.db.prepare(sql).bind(...options.params)
        : this.db.prepare(sql);

      return await stmt.all<T>();
    } catch (error) {
      console.error('D1 query error:', error);
      if (options.throwOnError !== false) {
        throw error;
      }
      return { results: [], success: false, error: String(error) } as D1Result<T>;
    }
  }

  /**
   * Execute a single query and return first result
   */
  async queryOne<T = unknown>(
    sql: string,
    options: QueryOptions = {},
  ): Promise<T | null> {
    const result = await this.query<T>(sql, options);
    return result.results?.[0] || null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    options: QueryOptions = {},
  ): Promise<D1Result> {
    try {
      const stmt = options.params
        ? this.db.prepare(sql).bind(...options.params)
        : this.db.prepare(sql);

      return await stmt.run();
    } catch (error) {
      console.error('D1 execute error:', error);
      if (options.throwOnError !== false) {
        throw error;
      }
      return { results: [], success: false, error: String(error) };
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: string[]): Promise<D1Result[]> {
    const stmts = statements.map((sql) => this.db.prepare(sql));
    return await this.db.batch(stmts);
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (db: D1Database) => Promise<T>,
  ): Promise<T> {
    // D1 doesn't have explicit transactions yet, but batch operations are atomic
    return await callback(this.db);
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.query(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      { params: [tableName], throwOnError: false },
    );
    return (result.results?.length ?? 0) > 0;
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string) {
    return await this.query(`PRAGMA table_info(${tableName})`);
  }
}

/**
 * Migration system for D1
 */
export interface Migration {
  id: number;
  name: string;
  up: string;
  down?: string;
}

export class MigrationRunner {
  private db: D1Helper;

  constructor(database: D1Database) {
    this.db = new D1Helper(database);
  }

  /**
   * Initialize migrations table
   */
  async init(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Get executed migrations
   */
  async getExecutedMigrations(): Promise<number[]> {
    const result = await this.db.query<{ id: number }>(
      'SELECT id FROM migrations ORDER BY id',
    );
    return result.results?.map((r) => r.id) ?? [];
  }

  /**
   * Run pending migrations
   */
  async runMigrations(migrations: Migration[]): Promise<void> {
    await this.init();
    const executed = await this.getExecutedMigrations();

    const pending = migrations.filter((m) => !executed.includes(m.id));

    for (const migration of pending) {
      console.log(`Running migration ${migration.id}: ${migration.name}`);
      await this.db.execute(migration.up);
      await this.db.execute(
        'INSERT INTO migrations (id, name) VALUES (?, ?)',
        { params: [migration.id, migration.name] },
      );
    }
  }

  /**
   * Rollback last migration
   */
  async rollback(migrations: Migration[]): Promise<void> {
    const executed = await this.getExecutedMigrations();
    const lastId = executed[executed.length - 1];

    if (!lastId) {
      throw new Error('No migrations to rollback');
    }

    const migration = migrations.find((m) => m.id === lastId);
    if (!migration?.down) {
      throw new Error(`Migration ${lastId} has no down migration`);
    }

    console.log(`Rolling back migration ${migration.id}: ${migration.name}`);
    await this.db.execute(migration.down);
    await this.db.execute('DELETE FROM migrations WHERE id = ?', {
      params: [lastId],
    });
  }
}
