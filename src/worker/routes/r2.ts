/**
 * R2 Storage route examples
 * Demonstrates object storage operations with Cloudflare R2
 */

import type { Env } from '../types';
import { jsonResponse, errorResponses, noContentResponse } from '../utils/response';
import { NotFoundError, ValidationError, toApiError } from '../utils/errors';

/**
 * POST /api/r2/upload - Upload a file to R2
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    // Check content type
    const contentType = request.headers.get('Content-Type');
    if (!contentType) {
      throw new ValidationError('Content-Type header is required');
    }

    // Get filename from query param or generate one
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename') || `file_${Date.now()}`;
    const folder = url.searchParams.get('folder') || 'uploads';
    const key = `${folder}/${filename}`;

    // Get file data
    const fileData = await request.arrayBuffer();

    // Upload to R2
    await env.UPLOADS.put(key, fileData, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: filename,
      },
    });

    return jsonResponse(
      {
        key,
        filename,
        folder,
        size: fileData.byteLength,
        contentType,
        message: 'File uploaded successfully',
      },
      201
    );
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * GET /api/r2/:key - Download a file from R2
 */
export async function handleDownload(key: string, env: Env): Promise<Response> {
  try {
    const object = await env.UPLOADS.get(key);

    if (!object) {
      throw new NotFoundError('File');
    }

    // Return the file with appropriate headers
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Length': String(object.size),
        'ETag': object.etag,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError instanceof NotFoundError) {
      return errorResponses.notFound(`File '${key}' not found`);
    }
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * HEAD /api/r2/:key - Get file metadata
 */
export async function handleGetMetadata(key: string, env: Env): Promise<Response> {
  try {
    const object = await env.UPLOADS.head(key);

    if (!object) {
      throw new NotFoundError('File');
    }

    return jsonResponse({
      key,
      size: object.size,
      etag: object.etag,
      uploadedAt: object.uploaded,
      contentType: object.httpMetadata?.contentType,
      customMetadata: object.customMetadata,
    });
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError instanceof NotFoundError) {
      return errorResponses.notFound(`File '${key}' not found`);
    }
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * DELETE /api/r2/:key - Delete a file from R2
 */
export async function handleDeleteFile(key: string, env: Env): Promise<Response> {
  try {
    await env.UPLOADS.delete(key);
    return noContentResponse();
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * GET /api/r2 - List files with optional prefix
 */
export async function handleListFiles(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const cursor = url.searchParams.get('cursor') || undefined;

    const listed = await env.UPLOADS.list({
      prefix,
      limit,
      cursor,
    });

    return jsonResponse({
      objects: listed.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        etag: obj.etag,
        uploadedAt: obj.uploaded,
        contentType: obj.httpMetadata?.contentType,
      })),
      truncated: listed.truncated,
      cursor: listed.cursor,
    });
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}

/**
 * POST /api/r2/multipart/create - Initiate multipart upload
 */
export async function handleCreateMultipartUpload(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const { key } = await request.json() as { key: string };
    
    if (!key) {
      throw new ValidationError('Key is required');
    }

    const multipartUpload = await env.UPLOADS.createMultipartUpload(key);

    return jsonResponse(
      {
        key,
        uploadId: multipartUpload.uploadId,
        message: 'Multipart upload initiated',
      },
      201
    );
  } catch (error) {
    const apiError = toApiError(error);
    return errorResponses.internalError(apiError.message, apiError.details);
  }
}
