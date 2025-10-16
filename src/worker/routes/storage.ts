import { RouteHandler, WorkerError } from '../types';
import { ResponseBuilder } from '../utils/response';
import { StorageManager } from '../utils/storage';
import { RequestValidator } from '../utils/validation';

/**
 * R2 Storage route handlers
 */

/**
 * POST /api/storage/upload - Upload file to R2
 */
export const uploadHandler: RouteHandler = async (request, env) => {
  const contentType = request.headers.get('content-type');
  
  if (!contentType?.includes('multipart/form-data')) {
    throw new WorkerError(
      'Content-Type must be multipart/form-data',
      400,
      'INVALID_CONTENT_TYPE'
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    throw new WorkerError(
      'No file provided',
      400,
      'MISSING_FILE'
    );
  }

  const storage = new StorageManager(env.MY_BUCKET);
  const key = `uploads/${crypto.randomUUID()}-${file.name}`;
  
  const object = await storage.putWithMetadata(
    key,
    await file.arrayBuffer(),
    {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
    file.type
  );

  return ResponseBuilder.success({
    key: object.key,
    size: object.size,
    uploaded: object.uploaded.toISOString(),
  });
};

/**
 * GET /api/storage/:key - Download file from R2
 */
export const downloadHandler: RouteHandler = async (request, env, ctx, params) => {
  const key = params?.key;
  
  if (!key) {
    throw new WorkerError(
      'File key is required',
      400,
      'MISSING_KEY'
    );
  }

  const storage = new StorageManager(env.MY_BUCKET);
  const object = await storage.get(decodeURIComponent(key));

  if (!object) {
    throw new WorkerError(
      'File not found',
      404,
      'FILE_NOT_FOUND'
    );
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Length': object.size.toString(),
      'ETag': object.httpEtag,
    },
  });
};

/**
 * DELETE /api/storage/:key - Delete file from R2
 */
export const deleteFileHandler: RouteHandler = async (request, env, ctx, params) => {
  const key = params?.key;
  
  if (!key) {
    throw new WorkerError(
      'File key is required',
      400,
      'MISSING_KEY'
    );
  }

  const storage = new StorageManager(env.MY_BUCKET);
  await storage.delete(decodeURIComponent(key));

  return ResponseBuilder.success({ message: 'File deleted successfully' });
};

/**
 * GET /api/storage - List files in R2
 */
export const listFilesHandler: RouteHandler = async (request, env) => {
  const url = new URL(request.url);
  const prefix = url.searchParams.get('prefix') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const storage = new StorageManager(env.MY_BUCKET);
  const result = await storage.list(prefix, limit);

  return ResponseBuilder.success({
    objects: result.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    })),
    truncated: result.truncated,
  });
};
