// ===========================================
// D1 Database Utilities
// Helper functions for D1 database operations
// ===========================================

import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type { Env, DbUser, DbSession } from '../types';
import { ApiError, ErrorCode } from '../types';
import { getLogger } from './logger';

const logger = getLogger('Database');

/**
 * Database Client
 * Provides type-safe methods for database operations
 */
export class DatabaseClient {
  constructor(private db: D1Database) {}

  /**
   * Execute a query with parameters
   */
  async query<T = any>(sql: string, ...params: any[]): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all<T>();
      return result.results || [];
    } catch (error) {
      logger.error('Database query failed', { sql, error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Database query failed');
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryOne<T = any>(sql: string, ...params: any[]): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first<T>();
      return result || null;
    } catch (error) {
      logger.error('Database query failed', { sql, error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Database query failed');
    }
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, ...params: any[]): Promise<D1Result> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return result;
    } catch (error) {
      logger.error('Database execution failed', { sql, error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Database operation failed');
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: Array<{ sql: string; params?: any[] }>): Promise<D1Result[]> {
    try {
      const preparedStatements = statements.map((stmt) => {
        const prepared = this.db.prepare(stmt.sql);
        return stmt.params ? prepared.bind(...stmt.params) : prepared;
      });

      const results = await this.db.batch(preparedStatements);
      return results;
    } catch (error) {
      logger.error('Database batch execution failed', { error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Database batch operation failed');
    }
  }

  /**
   * User management methods
   */
  async getUser(id: string): Promise<DbUser | null> {
    return this.queryOne<DbUser>(
      'SELECT * FROM users WHERE id = ?',
      id
    );
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    return this.queryOne<DbUser>(
      'SELECT * FROM users WHERE email = ?',
      email
    );
  }

  async createUser(user: Omit<DbUser, 'id' | 'created_at' | 'updated_at'>): Promise<DbUser> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO users (id, email, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      user.email,
      user.name,
      now,
      now
    );

    return (await this.getUser(id))!;
  }

  async updateUser(id: string, updates: Partial<Omit<DbUser, 'id' | 'created_at'>>): Promise<DbUser | null> {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      ...values
    );

    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.execute('DELETE FROM users WHERE id = ?', id);
    return result.success;
  }

  /**
   * Session management methods
   */
  async getSession(token: string): Promise<DbSession | null> {
    return this.queryOne<DbSession>(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")',
      token
    );
  }

  async createSession(userId: string, expiresIn: number = 86400): Promise<DbSession> {
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    await this.execute(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      id,
      userId,
      token,
      expiresAt.toISOString(),
      now.toISOString()
    );

    return (await this.getSession(token))!;
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await this.execute('DELETE FROM sessions WHERE token = ?', token);
    return result.success;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.execute(
      'DELETE FROM sessions WHERE expires_at <= datetime("now")'
    );
    return result.meta?.changes || 0;
  }
}

/**
 * Create a database client
 */
export function createDatabaseClient(env: Env): DatabaseClient {
  return new DatabaseClient(env.DB);
}

/**
 * SQL template tag for better syntax highlighting
 */
export function sql(strings: TemplateStringsArray, ...values: any[]): { sql: string; params: any[] } {
  return {
    sql: strings.join('?'),
    params: values,
  };
}
