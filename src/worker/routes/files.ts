/**
 * R2 storage routes for file management
 */

import type { Env } from '../types/env';
import type { FileMetadata } from '../types/models';
import { successResponse, notFoundError, validationError } from '../utils/response';
import { NotFoundError } from '../utils/errors';
import { createLogger } from '../utils/logger';

/**
 * Get a file from R2 storage
 */
export async function getFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Getting file from R2', { key });

    const object = await env.FILES.get(key);

    if (!object) {
      logger.warn('File not found', { key });
      throw new NotFoundError('File');
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    // Get custom metadata if available
    if (object.customMetadata) {
      headers.set('x-custom-metadata', JSON.stringify(object.customMetadata));
    }

    logger.info('File retrieved', { key, size: object.size });

    return new Response(object.body, {
      headers,
    });
  } catch (error) {
    logger.error('Failed to get file', error);
    if (error instanceof NotFoundError) {
      return notFoundError('File');
    }
    throw error;
  }
}

/**
 * Upload a file to R2 storage
 */
export async function uploadFile(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    
    // For multipart form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const filename = formData.get('filename') as string || file?.name;

      if (!file) {
        return validationError('No file provided');
      }

      if (!filename) {
        return validationError('Filename is required');
      }

      logger.info('Uploading file', { filename, size: file.size });

      // Generate unique key
      const key = `${Date.now()}-${filename}`;
      const uploadedAt = new Date().toISOString();

      // Prepare metadata
      const metadata: FileMetadata = {
        filename,
        contentType: file.type || contentType,
        size: file.size,
        uploadedAt,
      };

      // Upload to R2
      await env.FILES.put(key, file, {
        httpMetadata: {
          contentType: file.type || contentType,
        },
        customMetadata: metadata as Record<string, string>,
      });

      logger.info('File uploaded successfully', { key });

      return successResponse(
        {
          key,
          ...metadata,
          url: `/api/files/${key}`,
        },
        201
      );
    }

    // For direct binary upload
    const filename = request.headers.get('x-filename');
    if (!filename) {
      return validationError('x-filename header is required for binary uploads');
    }

    const body = await request.arrayBuffer();
    const key = `${Date.now()}-${filename}`;
    const uploadedAt = new Date().toISOString();

    logger.info('Uploading binary file', { filename, size: body.byteLength });

    const metadata: FileMetadata = {
      filename,
      contentType,
      size: body.byteLength,
      uploadedAt,
    };

    await env.FILES.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: metadata as Record<string, string>,
    });

    logger.info('Binary file uploaded successfully', { key });

    return successResponse(
      {
        key,
        ...metadata,
        url: `/api/files/${key}`,
      },
      201
    );
  } catch (error) {
    logger.error('Failed to upload file', error);
    throw error;
  }
}

/**
 * Delete a file from R2 storage
 */
export async function deleteFile(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Deleting file from R2', { key });

    // Check if file exists
    const object = await env.FILES.head(key);
    if (!object) {
      logger.warn('File not found', { key });
      throw new NotFoundError('File');
    }

    await env.FILES.delete(key);

    logger.info('File deleted successfully', { key });

    return successResponse({
      key,
      message: 'File deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete file', error);
    if (error instanceof NotFoundError) {
      return notFoundError('File');
    }
    throw error;
  }
}

/**
 * List files in R2 storage
 */
export async function listFiles(
  request: Request,
  env: Env
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    const url = new URL(request.url);
    const prefix = url.searchParams.get('prefix') || undefined;
    const limit = Math.min(
      100,
      parseInt(url.searchParams.get('limit') || '10', 10)
    );
    const cursor = url.searchParams.get('cursor') || undefined;

    logger.info('Listing files from R2', { prefix, limit });

    const listed = await env.FILES.list({
      prefix,
      limit,
      cursor,
    });

    const files = listed.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      httpEtag: obj.httpEtag,
      customMetadata: obj.customMetadata,
    }));

    logger.info('Files listed', { count: files.length });

    return successResponse({
      files,
      truncated: listed.truncated,
      cursor: listed.cursor,
    });
  } catch (error) {
    logger.error('Failed to list files', error);
    throw error;
  }
}

/**
 * Get file metadata without downloading the file
 */
export async function getFileMetadata(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const logger = createLogger(request);
  
  try {
    logger.info('Getting file metadata', { key });

    const object = await env.FILES.head(key);

    if (!object) {
      logger.warn('File not found', { key });
      throw new NotFoundError('File');
    }

    logger.info('File metadata retrieved', { key });

    return successResponse({
      key: object.key,
      size: object.size,
      uploaded: object.uploaded.toISOString(),
      httpEtag: object.httpEtag,
      httpMetadata: object.httpMetadata,
      customMetadata: object.customMetadata,
    });
  } catch (error) {
    logger.error('Failed to get file metadata', error);
    if (error instanceof NotFoundError) {
      return notFoundError('File');
    }
    throw error;
  }
}
