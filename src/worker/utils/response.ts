/**
 * Response Utilities
 * 
 * Helper functions for creating standardized API responses
 */

export interface SuccessResponseData<T = any> {
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    [key: string]: any;
  };
}

export interface ErrorResponseData {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
  };
}

/**
 * Create a successful JSON response
 */
export function createSuccessResponse<T>(
  data: T,
  status = 200,
  headers?: HeadersInit
): Response {
  const body: SuccessResponseData<T> = { data };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a paginated JSON response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  perPage: number,
  total: number,
  headers?: HeadersInit
): Response {
  const body: SuccessResponseData<T[]> = {
    data,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Create a created (201) response
 */
export function createCreatedResponse<T>(
  data: T,
  location?: string,
  headers?: HeadersInit
): Response {
  const responseHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (location) {
    (responseHeaders as Record<string, string>)['Location'] = location;
  }

  return createSuccessResponse(data, 201, responseHeaders);
}

/**
 * Create a no content (204) response
 */
export function createNoContentResponse(headers?: HeadersInit): Response {
  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Create a redirect response
 */
export function createRedirectResponse(
  location: string,
  permanent = false
): Response {
  return new Response(null, {
    status: permanent ? 301 : 302,
    headers: {
      Location: location,
    },
  });
}

/**
 * Parse JSON body from a request
 */
export async function parseJsonBody<T = any>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Get query parameters from a request
 */
export function getQueryParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * Get a single query parameter
 */
export function getQueryParam(
  request: Request,
  key: string,
  defaultValue?: string
): string | undefined {
  const params = getQueryParams(request);
  return params.get(key) || defaultValue;
}

/**
 * Create a streaming response
 */
export function createStreamingResponse(
  stream: ReadableStream,
  headers?: HeadersInit
): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...headers,
    },
  });
}
