/**
 * API Response Types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId?: string;
  };
}
