/**
 * D1 Database utility functions
 */

import { Env, User, Session, ApiLog, AppError } from '../types';
import { Logger } from './logger';

export class Database {
  private db: D1Database;
  private logger: Logger;

  constructor(env: Env, logger: Logger) {
    if (!env.DB) {
      throw new AppError(
        'DATABASE_NOT_CONFIGURED',
        'D1 Database is not configured',
        500
      );
    }
    this.db = env.DB;
    this.logger = logger;
  }

  /**
   * Execute a query with error handling and logging
   */
  private async execute<T = any>(
    query: string,
    params: any[] = []
  ): Promise<D1Result<T>> {
    try {
      this.logger.debug('Database query', { query, params });
      const result = await this.db.prepare(query).bind(...params).all<T>();
      return result;
    } catch (error) {
      this.logger.error('Database query failed', error);
      throw new AppError(
        'DATABASE_ERROR',
        'Database query failed',
        500,
        { error: (error as Error).message, query }
      );
    }
  }

  /**
   * Execute a single row query
   */
  private async fetchOne<T = any>(
    query: string,
    params: any[] = []
  ): Promise<T | null> {
    try {
      const result = await this.db.prepare(query).bind(...params).first<T>();
      return result;
    } catch (error) {
      this.logger.error('Database fetchOne failed', error);
      throw new AppError(
        'DATABASE_ERROR',
        'Database query failed',
        500,
        { error: (error as Error).message }
      );
    }
  }

  // User operations
  async getUser(id: string): Promise<User | null> {
    return this.fetchOne<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.fetchOne<User>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
  }

  async createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    await this.execute(
      `INSERT INTO users (id, email, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, user.email, user.name, now, now]
    );

    return {
      id,
      ...user,
      created_at: now,
      updated_at: now,
    };
  }

  async updateUser(id: string, updates: Partial<Pick<User, 'email' | 'name'>>): Promise<User | null> {
    const user = await this.getUser(id);
    if (!user) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (fields.length === 0) return user;

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await this.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getUser(id);
  }

  // Session operations
  async createSession(userId: string, expiresIn: number = 86400): Promise<Session> {
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresIn * 1000);

    await this.execute(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, userId, token, expiresAt.toISOString(), now.toISOString()]
    );

    return {
      id,
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
    };
  }

  async getSession(token: string): Promise<Session | null> {
    const session = await this.fetchOne<Session>(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")',
      [token]
    );
    return session;
  }

  async deleteSession(token: string): Promise<void> {
    await this.execute('DELETE FROM sessions WHERE token = ?', [token]);
  }

  // API logging
  async logApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number,
    userId?: string
  ): Promise<void> {
    const id = crypto.randomUUID();
    await this.execute(
      `INSERT INTO api_logs (id, endpoint, method, status_code, duration_ms, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, endpoint, method, statusCode, durationMs, userId || null, new Date().toISOString()]
    );
  }

  async getApiLogs(limit: number = 100): Promise<ApiLog[]> {
    const result = await this.execute<ApiLog>(
      'SELECT * FROM api_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return result.results || [];
  }

  /**
   * Run a transaction
   */
  async batch(statements: string[][]): Promise<D1Result[]> {
    try {
      const batch = statements.map(([sql, ...params]) =>
        this.db.prepare(sql).bind(...params)
      );
      return await this.db.batch(batch);
    } catch (error) {
      this.logger.error('Database batch failed', error);
      throw new AppError(
        'DATABASE_BATCH_ERROR',
        'Database batch operation failed',
        500,
        { error: (error as Error).message }
      );
    }
  }
}
