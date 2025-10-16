/**
 * Database Types for D1
 * TypeScript types for all database tables and queries
 */

// ===========================================
// User Types
// ===========================================

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: number;
  updated_at: number;
  last_login_at: number | null;
}

export interface CreateUserInput {
  id?: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface UpdateUserInput {
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  is_active?: boolean;
  is_verified?: boolean;
}

// ===========================================
// Post Types
// ===========================================

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface CreatePostInput {
  id?: string;
  user_id: string;
  title: string;
  content: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  slug?: string;
  excerpt?: string;
  featured_image?: string;
  status?: 'draft' | 'published' | 'archived';
  published_at?: number;
}

// ===========================================
// Comment Types
// ===========================================

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

export interface CreateCommentInput {
  id?: string;
  post_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
}

// ===========================================
// Session Types
// ===========================================

export interface Session {
  id: string;
  user_id: string;
  token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: number;
  created_at: number;
}

export interface CreateSessionInput {
  id?: string;
  user_id: string;
  token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: number;
}

// ===========================================
// API Key Types
// ===========================================

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  last_used_at: number | null;
  expires_at: number | null;
  is_active: boolean;
  permissions: string | null;
  created_at: number;
}

// ===========================================
// Analytics Types
// ===========================================

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  metadata: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
}

export interface CreateAnalyticsEventInput {
  id?: string;
  event_type: string;
  user_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

// ===========================================
// Settings Types
// ===========================================

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  updated_at: number;
}

// ===========================================
// Pagination Types
// ===========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===========================================
// Query Result Types
// ===========================================

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1Response<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: any;
}
