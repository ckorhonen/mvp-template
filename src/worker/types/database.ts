/**
 * User model
 */
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

/**
 * User creation input
 */
export interface CreateUserInput {
  email: string;
  name: string;
}

/**
 * User update input
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
}

/**
 * API Key model
 */
export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  revoked_at?: string;
}

/**
 * Session model
 */
export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
}

/**
 * Analytics Event model
 */
export interface AnalyticsEvent {
  id: string;
  event_type: string;
  user_id?: string;
  data: Record<string, any>;
  timestamp: string;
}

/**
 * Database query result
 */
export interface QueryResult<T> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

/**
 * Database transaction options
 */
export interface TransactionOptions {
  readOnly?: boolean;
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
}
