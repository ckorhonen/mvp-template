/**
 * Storage Routes
 * Handles KV and R2 storage operations
 */

import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/response';

/**
 * GET /api/cache/:key
 * Get a value from KV cache
 */
export async function getCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    if (!env.CACHE) {
      return errorResponse('Cache not configured', 500);
    }

    const value = await env.CACHE.get(key);

    if (value === null) {
      return errorResponse('Key not found', 404);
    }

    return jsonResponse({
      success: true,
      data: {
        key,
        value: JSON.parse(value),
      },
    });
  } catch (error) {
    console.error('Get cache value error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get cache value',
      500
    );
  }
}

/**
 * PUT /api/cache/:key
 * Set a value in KV cache
 */
export async function setCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    if (!env.CACHE) {
      return errorResponse('Cache not configured', 500);
    }

    const body = await request.json() as {
      value: unknown;
      ttl?: number;
    };

    if (body.value === undefined) {
      return errorResponse('Value is required', 400);
    }

    const options: KVNamespacePutOptions = {};
    if (body.ttl) {
      options.expirationTtl = body.ttl;
    }

    await env.CACHE.put(key, JSON.stringify(body.value), options);

    return jsonResponse(
      {
        success: true,
        message: 'Value cached successfully',
        data: { key },
      },
      201
    );
  } catch (error) {
    console.error('Set cache value error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to set cache value',
      500
    );
  }
}

/**
 * DELETE /api/cache/:key
 * Delete a value from KV cache
 */
export async function deleteCacheValue(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    if (!env.CACHE) {
      return errorResponse('Cache not configured', 500);
    }

    await env.CACHE.delete(key);

    return jsonResponse({
      success: true,
      message: 'Value deleted successfully',
    });
  } catch (error) {
    console.error('Delete cache value error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete cache value',
      500
    );
  }
}

/**
 * POST /api/uploads
 * Upload a file to R2
 */
export async function uploadFile(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!env.UPLOADS) {
      return errorResponse('Uploads bucket not configured', 500);
    }

    const contentType = request.headers.get('content-type') || '';

    // Handle multipart form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return errorResponse('No file provided', 400);
      }

      const key = `uploads/${Date.now()}-${file.name}`;
      const arrayBuffer = await file.arrayBuffer();

      await env.UPLOADS.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });

      return jsonResponse(
        {
          success: true,
          data: {
            key,
            size: file.size,
            contentType: file.type,
            url: `/api/uploads/${encodeURIComponent(key)}`,
          },
        },
        201
      );
    }

    // Handle direct binary upload
    const key = `uploads/${Date.now()}-file`;
    const body = await request.arrayBuffer();

    await env.UPLOADS.put(key, body, {
      httpMetadata: {
        contentType: contentType || 'application/octet-stream',
      },
    });

    return jsonResponse(
      {
        success: true,
        data: {
          key,
          size: body.byteLength,
          contentType: contentType || 'application/octet-stream',
          url: `/api/uploads/${encodeURIComponent(key)}`,
        },
      },
      201
    );
  } catch (error) {
    console.error('Upload file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to upload file',
      500
    );
  }
}

/**
 * GET /api/uploads/:key
 * Download a file from R2
 */
export async function downloadFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    if (!env.UPLOADS) {
      return errorResponse('Uploads bucket not configured', 500);
    }

    const object = await env.UPLOADS.get(key);

    if (!object) {
      return errorResponse('File not found', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error('Download file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to download file',
      500
    );
  }
}

/**
 * DELETE /api/uploads/:key
 * Delete a file from R2
 */
export async function deleteFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  try {
    if (!env.UPLOADS) {
      return errorResponse('Uploads bucket not configured', 500);
    }

    await env.UPLOADS.delete(key);

    return jsonResponse({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete file',
      500
    );
  }
}

/**
 * GET /api/uploads
 * List files in R2 bucket
 */
export async function listFiles(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    if (!env.UPLOADS) {
      return errorResponse('Uploads bucket not configured', 500);
    }

    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || '';
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const cursor = url.searchParams.get('cursor') || undefined;

    const listed = await env.UPLOADS.list({
      prefix,
      limit,
      cursor,
    });

    return jsonResponse({
      success: true,
      data: {
        objects: listed.objects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          httpEtag: obj.httpEtag,
          url: `/api/uploads/${encodeURIComponent(obj.key)}`,
        })),
        truncated: listed.truncated,
        cursor: listed.cursor,
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list files',
      500
    );
  }
}
