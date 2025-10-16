/**
 * D1 Database Service
 * Type-safe wrapper for Cloudflare D1 database operations
 */

import { Env } from '../types';

export interface QueryOptions {
  returnFirst?: boolean;
}

export interface PaginationOptions {
  page?: number;
  perPage?: number;
}

export interface WhereClause {
  column: string;
  value: unknown;
  operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
}

export class D1DatabaseService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  /**
   * Execute a raw SQL query
   */
  async query<T = unknown>(
    sql: string,
    params: unknown[] = [],
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all<T>();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.results || [];
    } catch (error) {
      console.error('D1 query error:', error);
      throw error;
    }
  }

  /**
   * Execute a query and return the first result
   */
  async queryFirst<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results[0] || null;
  }

  /**
   * Execute a query and return a single value
   */
  async queryValue<T = unknown>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first<T>();
      return result || null;
    } catch (error) {
      console.error('D1 query value error:', error);
      throw error;
    }
  }

  /**
   * Execute a statement (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<D1Result<unknown>> {
    try {
      return await this.db.prepare(sql).bind(...params).run();
    } catch (error) {
      console.error('D1 execute error:', error);
      throw error;
    }
  }

  /**
   * Insert a record
   */
  async insert(
    table: string,
    data: Record<string, unknown>
  ): Promise<number> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.execute(sql, values);

    // Return last inserted ID
    const lastId = await this.queryValue<{ id: number }>(
      `SELECT last_insert_rowid() as id`
    );

    return lastId?.id || 0;
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: Record<string, unknown>,
    where: WhereClause | WhereClause[]
  ): Promise<number> {
    const updates = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(data);

    const whereConditions = this.buildWhereClause(where);
    const sql = `UPDATE ${table} SET ${updates} WHERE ${whereConditions.clause}`;

    const result = await this.execute(sql, [
      ...values,
      ...whereConditions.params,
    ]);
    return result.meta?.changes || 0;
  }

  /**
   * Delete records
   */
  async delete(table: string, where: WhereClause | WhereClause[]): Promise<number> {
    const whereConditions = this.buildWhereClause(where);
    const sql = `DELETE FROM ${table} WHERE ${whereConditions.clause}`;

    const result = await this.execute(sql, whereConditions.params);
    return result.meta?.changes || 0;
  }

  /**
   * Find records with optional where clause and pagination
   */
  async find<T = unknown>(
    table: string,
    options?: {
      where?: WhereClause | WhereClause[];
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: unknown[] = [];

    if (options?.where) {
      const whereConditions = this.buildWhereClause(options.where);
      sql += ` WHERE ${whereConditions.clause}`;
      params.push(...whereConditions.params);
    }

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }

    if (options?.limit) {
      sql += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      sql += ` OFFSET ?`;
      params.push(options.offset);
    }

    return this.query<T>(sql, params);
  }

  /**
   * Find a single record by ID
   */
  async findById<T = unknown>(table: string, id: number | string): Promise<T | null> {
    const results = await this.find<T>(table, {
      where: { column: 'id', value: id },
      limit: 1,
    });
    return results[0] || null;
  }

  /**
   * Count records
   */
  async count(
    table: string,
    where?: WhereClause | WhereClause[]
  ): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: unknown[] = [];

    if (where) {
      const whereConditions = this.buildWhereClause(where);
      sql += ` WHERE ${whereConditions.clause}`;
      params.push(...whereConditions.params);
    }

    const result = await this.queryFirst<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Check if a record exists
   */
  async exists(
    table: string,
    where: WhereClause | WhereClause[]
  ): Promise<boolean> {
    const count = await this.count(table, where);
    return count > 0;
  }

  /**
   * Execute multiple statements in a batch
   */
  async batch(statements: string[]): Promise<D1Result<unknown>[]> {
    try {
      const prepared = statements.map((sql) => this.db.prepare(sql));
      return await this.db.batch(prepared);
    } catch (error) {
      console.error('D1 batch error:', error);
      throw error;
    }
  }

  /**
   * Build WHERE clause from conditions
   */
  private buildWhereClause(
    where: WhereClause | WhereClause[]
  ): { clause: string; params: unknown[] } {
    const conditions = Array.isArray(where) ? where : [where];
    const clauses: string[] = [];
    const params: unknown[] = [];

    for (const condition of conditions) {
      const operator = condition.operator || '=';

      if (operator === 'IN') {
        const values = Array.isArray(condition.value)
          ? condition.value
          : [condition.value];
        const placeholders = values.map(() => '?').join(', ');
        clauses.push(`${condition.column} IN (${placeholders})`);
        params.push(...values);
      } else {
        clauses.push(`${condition.column} ${operator} ?`);
        params.push(condition.value);
      }
    }

    return {
      clause: clauses.join(' AND '),
      params,
    };
  }

  /**
   * Paginate results
   */
  async paginate<T = unknown>(
    table: string,
    options: PaginationOptions & {
      where?: WhereClause | WhereClause[];
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    }
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      perPage: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const page = options.page || 1;
    const perPage = options.perPage || 10;
    const offset = (page - 1) * perPage;

    // Get total count
    const total = await this.count(table, options.where);

    // Get paginated data
    const data = await this.find<T>(table, {
      where: options.where,
      orderBy: options.orderBy,
      orderDirection: options.orderDirection,
      limit: perPage,
      offset,
    });

    const totalPages = Math.ceil(total / perPage);

    return {
      data,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

/**
 * Factory function to create D1 service
 */
export function createD1Service(env: Env): D1DatabaseService {
  return new D1DatabaseService(env);
}
