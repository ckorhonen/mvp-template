/**
 * D1 Database Types and Helpers
 */

import { D1Database, D1Result } from '@cloudflare/workers-types';

/**
 * D1 Query Result with type safety
 */
export interface TypedD1Result<T> extends D1Result {
  results: T[];
}

/**
 * D1 Query builder helper types
 */
export type WhereClause = {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';
  value: any;
};

export type OrderBy = {
  field: string;
  direction: 'ASC' | 'DESC';
};

/**
 * Database models matching schema
 */
export interface DbUser {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  metadata: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface DbItem {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: string;
  tags: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface DbAuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
}

export interface DbSession {
  id: string;
  user_id: number;
  expires_at: number;
  data: string | null;
  created_at: number;
}
