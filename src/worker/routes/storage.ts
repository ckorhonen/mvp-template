/**
 * Storage Routes
 * Example API routes demonstrating R2 storage operations
 */

import type { Context } from '../types';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '../utils/response';
import { createUploadsStorage } from '../services/storage';
import { parseMultipartForm } from '../services/storage';

/**
 * POST /api/storage/upload
 * Upload a file to R2
 */
export async function uploadFile(ctx: Context): Promise<Response> {
  try {
    const formData = await parseMultipartForm(ctx.request);
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return badRequestResponse('File is required');
    }

    const storage = createUploadsStorage(ctx.env);
    
    // Generate unique filename
    const timestamp = Date.now();
    const key = `${timestamp}-${file.filename}`;

    // Upload to R2
    const result = await storage.upload(key, file.buffer, {
      contentType: file.contentType,
      customMetadata: {
        originalName: file.filename,
        uploadedBy: ctx.user?.id || 'anonymous',
        uploadedAt: new Date().toISOString(),
      },
    });

    if (!result) {
      return errorResponse('Failed to upload file', 500);
    }

    return successResponse({
      key,
      filename: file.filename,
      size: file.size,
      contentType: file.contentType,
      uploaded: true,
    }, 201);
  } catch (error) {
    console.error('Upload file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to upload file',
      500
    );
  }
}

/**
 * GET /api/storage/:key
 * Download a file from R2
 */
export async function downloadFile(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const key = params?.key;
    if (!key) {
      return badRequestResponse('File key is required');
    }

    const storage = createUploadsStorage(ctx.env);
    const object = await storage.download(key);

    if (!object) {
      return notFoundResponse('File not found');
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Length': object.size.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Download file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to download file',
      500
    );
  }
}

/**
 * DELETE /api/storage/:key
 * Delete a file from R2
 */
export async function deleteFile(ctx: Context, params?: Record<string, string>): Promise<Response> {
  try {
    const key = params?.key;
    if (!key) {
      return badRequestResponse('File key is required');
    }

    const storage = createUploadsStorage(ctx.env);
    
    // Check if file exists
    const exists = await storage.exists(key);
    if (!exists) {
      return notFoundResponse('File not found');
    }

    await storage.delete(key);

    return successResponse({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete file',
      500
    );
  }
}

/**
 * GET /api/storage
 * List files in R2
 */
export async function listFiles(ctx: Context): Promise<Response> {
  try {
    const url = new URL(ctx.request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const cursor = url.searchParams.get('cursor') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '100');

    const storage = createUploadsStorage(ctx.env);
    const result = await storage.list({ prefix, cursor, limit });

    const files = result.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
    }));

    return successResponse({
      files,
      truncated: result.truncated,
      cursor: result.cursor,
    });
  } catch (error) {
    console.error('List files error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to list files',
      500
    );
  }
}
