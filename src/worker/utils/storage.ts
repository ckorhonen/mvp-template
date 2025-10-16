// ===========================================
// R2 Storage Utilities
// Helper functions for R2 object storage
// ===========================================

import type { R2Bucket, R2Object } from '@cloudflare/workers-types';
import type { Env, UploadOptions, StorageObject } from '../types';
import { ApiError, ErrorCode } from '../types';
import { getLogger } from './logger';

const logger = getLogger('Storage');

/**
 * Storage Client
 * Provides methods for R2 object storage operations
 */
export class StorageClient {
  constructor(private bucket: R2Bucket) {}

  /**
   * Upload a file to R2
   */
  async put(
    key: string,
    data: ArrayBuffer | ReadableStream | string,
    options?: UploadOptions
  ): Promise<void> {
    try {
      await this.bucket.put(key, data, {
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
      });

      logger.info('File uploaded', { key, size: data instanceof ArrayBuffer ? data.byteLength : 'stream' });
    } catch (error) {
      logger.error('File upload failed', { key, error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to upload file');
    }
  }

  /**
   * Get a file from R2
   */
  async get(key: string): Promise<R2Object | null> {
    try {
      const object = await this.bucket.get(key);
      
      if (!object) {
        return null;
      }

      logger.debug('File retrieved', { key });
      return object;
    } catch (error) {
      logger.error('File retrieval failed', { key, error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to retrieve file');
    }
  }

  /**
   * Get file as array buffer
   */
  async getArrayBuffer(key: string): Promise<ArrayBuffer | null> {
    const object = await this.get(key);
    return object ? await object.arrayBuffer() : null;
  }

  /**
   * Get file as text
   */
  async getText(key: string): Promise<string | null> {
    const object = await this.get(key);
    return object ? await object.text() : null;
  }

  /**
   * Get file as blob
   */
  async getBlob(key: string): Promise<Blob | null> {
    const object = await this.get(key);
    return object ? await object.blob() : null;
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    try {
      await this.bucket.delete(key);
      logger.info('File deleted', { key });
    } catch (error) {
      logger.error('File deletion failed', { key, error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete file');
    }
  }

  /**
   * List files in R2
   */
  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ objects: StorageObject[]; cursor?: string; truncated: boolean }> {
    try {
      const result = await this.bucket.list({
        prefix: options?.prefix,
        limit: options?.limit,
        cursor: options?.cursor,
      });

      const objects: StorageObject[] = result.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded,
        httpMetadata: obj.httpMetadata,
        customMetadata: obj.customMetadata,
      }));

      return {
        objects,
        cursor: result.cursor,
        truncated: result.truncated,
      };
    } catch (error) {
      logger.error('File listing failed', { error });
      throw new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to list files');
    }
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const object = await this.bucket.head(key);
      return object !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Copy a file within R2
   */
  async copy(sourceKey: string, destKey: string): Promise<void> {
    try {
      const source = await this.get(sourceKey);
      
      if (!source) {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Source file not found');
      }

      await this.put(destKey, source.body, {
        httpMetadata: source.httpMetadata,
        customMetadata: source.customMetadata,
      });

      logger.info('File copied', { sourceKey, destKey });
    } catch (error) {
      logger.error('File copy failed', { sourceKey, destKey, error });
      throw error instanceof ApiError
        ? error
        : new ApiError(ErrorCode.INTERNAL_ERROR, 'Failed to copy file');
    }
  }

  /**
   * Move a file within R2
   */
  async move(sourceKey: string, destKey: string): Promise<void> {
    await this.copy(sourceKey, destKey);
    await this.delete(sourceKey);
  }

  /**
   * Generate a signed URL (presigned URL pattern)
   */
  generateSignedUrl(key: string, expiresIn: number = 3600): string {
    // Note: R2 doesn't natively support signed URLs yet
    // This is a placeholder for when it's supported
    // For now, you might want to use Workers to proxy the request
    return `/api/storage/${encodeURIComponent(key)}?expires=${Date.now() + expiresIn * 1000}`;
  }
}

/**
 * Create storage clients for different buckets
 */
export function createStorageClients(env: Env) {
  return {
    assets: new StorageClient(env.ASSETS),
    uploads: new StorageClient(env.UPLOADS),
    backups: new StorageClient(env.BACKUPS),
  };
}

/**
 * Helper to generate a unique file key
 */
export function generateFileKey(filename: string, userId?: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().substring(0, 8);
  const prefix = userId ? `${userId}/` : '';
  return `${prefix}${timestamp}-${random}-${filename}`;
}

/**
 * Helper to get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Helper to get MIME type from extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    
    // Archives
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}
