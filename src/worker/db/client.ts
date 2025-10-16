import type { Env } from '../types/env';
import type { User, CreateUserInput, UpdateUserInput } from '../types/database';
import { DatabaseError, NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { generateUuid } from '../utils/crypto';
import { toISOString } from '../utils/date';

const logger = createLogger('Database');

/**
 * Type-safe D1 database client
 */
export class DatabaseClient {
  private db: D1Database;
  private env: Env;

  constructor(env: Env) {
    this.db = env.DB;
    this.env = env;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      
      if (!result.success) {
        throw new DatabaseError('Query execution failed');
      }

      return result.results as T[];
    } catch (error) {
      logger.error('Database query failed', { sql, error });
      throw new DatabaseError('Database query failed', { sql, error: String(error) });
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, params: any[] = []): Promise<D1Result> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      
      if (!result.success) {
        throw new DatabaseError('Query execution failed');
      }

      return result;
    } catch (error) {
      logger.error('Database execution failed', { sql, error });
      throw new DatabaseError('Database execution failed', { sql, error: String(error) });
    }
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: { sql: string; params?: any[] }[]): Promise<D1Result[]> {
    try {
      const prepared = statements.map((stmt) =>
        this.db.prepare(stmt.sql).bind(...(stmt.params || []))
      );

      const results = await this.db.batch(prepared);
      return results;
    } catch (error) {
      logger.error('Batch execution failed', { error });
      throw new DatabaseError('Batch execution failed', { error: String(error) });
    }
  }

  // ============================================
  // User Management
  // ============================================

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const sql = `
      SELECT * FROM users 
      WHERE id = ? AND deleted_at IS NULL
    `;
    return this.queryOne<User>(sql, [id]);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const sql = `
      SELECT * FROM users 
      WHERE email = ? AND deleted_at IS NULL
    `;
    return this.queryOne<User>(sql, [email]);
  }

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const id = generateUuid();
    const now = toISOString();

    const sql = `
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `;

    const result = await this.queryOne<User>(sql, [
      id,
      input.email,
      input.name,
      now,
      now,
    ]);

    if (!result) {
      throw new DatabaseError('Failed to create user');
    }

    return result;
  }

  /**
   * Update a user
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email);
    }

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
    }

    updates.push('updated_at = ?');
    params.push(toISOString());

    params.push(id);

    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `;

    const result = await this.queryOne<User>(sql, params);
    if (!result) {
      throw new DatabaseError('Failed to update user');
    }

    return result;
  }

  /**
   * Soft delete a user
   */
  async deleteUser(id: string): Promise<void> {
    const sql = `
      UPDATE users 
      SET deleted_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `;

    const result = await this.execute(sql, [toISOString(), id]);
    
    if (result.meta.changes === 0) {
      throw new NotFoundError('User');
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(
    page: number = 1,
    perPage: number = 20
  ): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * perPage;

    // Get total count
    const countSql = 'SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL';
    const countResult = await this.queryOne<{ count: number }>(countSql);
    const total = countResult?.count || 0;

    // Get paginated results
    const sql = `
      SELECT * FROM users 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const users = await this.query<User>(sql, [perPage, offset]);

    return { users, total };
  }
}

/**
 * Helper function to create database client
 */
export function createDatabaseClient(env: Env): DatabaseClient {
  return new DatabaseClient(env);
}
