import { Middleware } from '../types';

/**
 * Logging middleware for request/response tracking
 */
export const loggingMiddleware: Middleware = async (
  request,
  env,
  ctx,
  next
) => {
  const startTime = Date.now();
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();

  console.log('Request:', {
    requestId,
    method: request.method,
    path: url.pathname,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await next();
    const duration = Date.now() - startTime;

    console.log('Response:', {
      requestId,
      status: response.status,
      duration: `${duration}ms`,
    });

    // Add request ID to response headers
    const headers = new Headers(response.headers);
    headers.set('X-Request-ID', requestId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('Request error:', {
      requestId,
      error,
      duration: `${duration}ms`,
    });

    throw error;
  }
};
