import type { WorkerContext } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { validateJsonBody, validateRequired } from '../utils/validation';
import { createLogger } from '../utils/logger';

const logger = createLogger('AnalyticsRoutes');

/**
 * POST /api/analytics/track
 * Track an analytics event
 */
export async function handleTrackEvent(ctx: WorkerContext): Promise<Response> {
  try {
    const body = await validateJsonBody<{
      event: string;
      properties?: Record<string, any>;
      userId?: string;
    }>(ctx.request);

    validateRequired(body, ['event']);

    // Track in Analytics Engine
    if (ctx.env.ANALYTICS) {
      ctx.env.ANALYTICS.writeDataPoint({
        blobs: [body.event, body.userId || 'anonymous'],
        doubles: [Date.now()],
        indexes: [new Date().toISOString()],
      });
    }

    // Also store in D1 for detailed analytics
    const analyticsData = {
      event_type: body.event,
      user_id: body.userId,
      properties: body.properties || {},
      timestamp: new Date().toISOString(),
    };

    logger.info('Event tracked', analyticsData);

    return successResponse({
      success: true,
      event: body.event,
      timestamp: analyticsData.timestamp,
    });
  } catch (error) {
    logger.error('Track event failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}

/**
 * GET /api/analytics/events
 * Get analytics events (example query)
 */
export async function handleGetEvents(ctx: WorkerContext): Promise<Response> {
  try {
    const url = new URL(ctx.request.url);
    const eventType = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    // This is a simplified example - in production you'd query from D1 or Analytics Engine
    // For Analytics Engine, you'd use the SQL API to query the data

    return successResponse({
      message: 'Analytics query functionality - implement based on your needs',
      eventType,
      limit,
    });
  } catch (error) {
    logger.error('Get events failed', { error });
    return errorResponse(
      error as Error,
      (error as any).statusCode || 500,
      ctx.env.ENVIRONMENT === 'development'
    );
  }
}
