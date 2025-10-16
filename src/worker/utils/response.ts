import { ApiResponse, WorkerError } from '../types';

/**
 * Response utility functions for consistent API responses
 */

export class ResponseBuilder {
  /**
   * Create a successful JSON response
   */
  static success<T>(
    data: T,
    status: number = 200,
    meta?: Record<string, any>
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    };

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  /**
   * Create an error JSON response
   */
  static error(
    error: WorkerError | Error,
    requestId?: string
  ): Response {
    const isWorkerError = error instanceof WorkerError;
    const statusCode = isWorkerError ? error.statusCode : 500;
    const errorCode = isWorkerError ? error.code : 'INTERNAL_ERROR';

    const response: ApiResponse = {
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        details: isWorkerError ? error.details : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  /**
   * Create a CORS response
   */
  static cors(
    response: Response,
    origin: string = '*',
    methods: string = 'GET, POST, PUT, DELETE, OPTIONS'
  ): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', methods);
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Handle OPTIONS preflight request
   */
  static preflight(): Response {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
}
