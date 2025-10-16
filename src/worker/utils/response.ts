/**
 * Standardized API Response Helpers
 */

import { ApiResponse, ApiError, ApiMeta } from '../types/api';
import { AppError } from './errors';

export class ResponseHelper {
  /**
   * Create a success response
   */
  static success<T>(
    data: T,
    meta?: Partial<ApiMeta>,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        version: 'v1',
        ...meta,
      },
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create an error response
   */
  static error(
    error: AppError | Error,
    statusCode?: number,
    requestId?: string
  ): Response {
    const isAppError = error instanceof AppError;
    const code = isAppError ? error.code : 'INTERNAL_ERROR';
    const status = isAppError ? error.statusCode : statusCode || 500;
    const details = isAppError ? error.details : undefined;

    const apiError: ApiError = {
      code,
      message: error.message,
      statusCode: status,
      ...(details && { details }),
    };

    const response: ApiResponse = {
      success: false,
      error: apiError,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || crypto.randomUUID(),
        version: 'v1',
      },
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    page: number,
    pageSize: number,
    total: number
  ): Response {
    const totalPages = Math.ceil(total / pageSize);

    return ResponseHelper.success(data, {
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  }

  /**
   * Create a no content response
   */
  static noContent(): Response {
    return new Response(null, {
      status: 204,
    });
  }

  /**
   * Create a redirect response
   */
  static redirect(url: string, permanent: boolean = false): Response {
    return Response.redirect(url, permanent ? 301 : 302);
  }
}
