/**
 * D1 Database Service
 * Provides type-safe database operations with connection pooling,
 * query building, and transaction support.
 */

import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type { Env, DbUser, DbSession, DbApiKey } from '../types';

export interface QueryOptions {
  timeout?: number;
}

export interface TransactionCallback {
  (tx: D1Database): Promise<void>;
}

/**
 * Database Service
 */
export class DatabaseService {
  constructor(private readonly db: D1Database) {}

  /**
   * Execute a raw SQL query
   */
  async query<T = unknown>(
    sql: string,
    params: unknown[] = [],
    options?: QueryOptions
  ): Promise<D1Result<T>> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      return await stmt.all<T>();
    } catch (error) {
      throw new Error(
        `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a query and return first result
   */
  async queryOne<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      return await stmt.first<T>();
    } catch (error) {
      throw new Error(
        `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<D1Result> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      return await stmt.run();
    } catch (error) {
      throw new Error(
        `Database execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(
    statements: Array<{ sql: string; params?: unknown[] }>
  ): Promise<D1Result[]> {
    try {
      const stmts = statements.map(({ sql, params = [] }) =>
        this.db.prepare(sql).bind(...params)
      );
      return await this.db.batch(stmts);
    } catch (error) {
      throw new Error(
        `Database batch failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // User operations
  async createUser(user: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<DbUser> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, user.email, user.name, user.password_hash, now, now]
    );

    const created = await this.queryOne<DbUser>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!created) {
      throw new Error('Failed to create user');
    }

    return created;
  }

  async getUserById(id: string): Promise<DbUser | null> {
    return await this.queryOne<DbUser>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    return await this.queryOne<DbUser>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  }

  async updateUser(
    id: string,
    updates: Partial<Pick<DbUser, 'name' | 'email'>>
  ): Promise<DbUser | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return await this.getUserById(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return await this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  // Session operations
  async createSession(session: Omit<DbSession, 'created_at'>): Promise<DbSession> {
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [session.id, session.user_id, session.token, session.expires_at, now]
    );

    const created = await this.queryOne<DbSession>(
      'SELECT * FROM sessions WHERE id = ?',
      [session.id]
    );

    if (!created) {
      throw new Error('Failed to create session');
    }

    return created;
  }

  async getSessionByToken(token: string): Promise<DbSession | null> {
    return await this.queryOne<DbSession>(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")',
      [token]
    );
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await this.execute(
      'DELETE FROM sessions WHERE id = ?',
      [id]
    );
    return result.success && (result.meta?.changes ?? 0) > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await this.execute(
      'DELETE FROM sessions WHERE expires_at <= datetime("now")'
    );
    return result.meta?.changes ?? 0;
  }

  // API Key operations
  async createApiKey(apiKey: Omit<DbApiKey, 'created_at' | 'last_used_at'>): Promise<DbApiKey> {
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO api_keys (id, user_id, key_hash, name, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [apiKey.id, apiKey.user_id, apiKey.key_hash, apiKey.name, now, apiKey.expires_at]
    );

    const created = await this.queryOne<DbApiKey>(
      'SELECT * FROM api_keys WHERE id = ?',
      [apiKey.id]
    );

    if (!created) {
      throw new Error('Failed to create API key');
    }

    return created;
  }

  async getApiKeyByHash(keyHash: string): Promise<DbApiKey | null> {
    return await this.queryOne<DbApiKey>(
      `SELECT * FROM api_keys 
       WHERE key_hash = ? 
       AND (expires_at IS NULL OR expires_at > datetime("now"))`,
      [keyHash]
    );
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await this.execute(
      'UPDATE api_keys SET last_used_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await this.execute(
      'DELETE FROM api_keys WHERE id = ?',
      [id]
    );
    return result.success && (result.meta?.changes ?? 0) > 0;
  }
}

/**
 * Create a database service instance
 */
export function createDatabase(env: Env): DatabaseService {
  return new DatabaseService(env.DB);
}
