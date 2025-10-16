/**
 * R2 Storage Service
 * Provides file upload, download, and management operations for R2 buckets
 */

import type { R2Bucket, R2Object } from '@cloudflare/workers-types';
import type { Env, FileUpload } from '../types';

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export interface ListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

/**
 * R2 Storage Service
 */
export class StorageService {
  constructor(private readonly bucket: R2Bucket) {}

  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    data: ArrayBuffer | ReadableStream | string,
    options?: UploadOptions
  ): Promise<R2Object | null> {
    try {
      return await this.bucket.put(key, data, {
        httpMetadata: options?.contentType
          ? { contentType: options.contentType }
          : undefined,
        customMetadata: options?.customMetadata,
      });
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download a file from R2
   */
  async download(key: string): Promise<R2Object | null> {
    try {
      return await this.bucket.get(key);
    } catch (error) {
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    try {
      await this.bucket.delete(key);
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
   * List files in bucket
   */
  async list(options?: ListOptions) {
    try {
      return await this.bucket.list({
        prefix: options?.prefix,
        cursor: options?.cursor,
        limit: options?.limit || 1000,
      });
    } catch (error) {
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string): Promise<R2Object | null> {
    try {
      return await this.bucket.head(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a signed URL for temporary access (if supported)
   */
  generatePresignedUrl(key: string, expiresIn: number): string {
    // Note: R2 doesn't natively support presigned URLs yet
    // This is a placeholder for future implementation
    throw new Error('Presigned URLs not yet supported for R2');
  }
}

/**
 * Parse multipart form data for file uploads
 */
export async function parseMultipartForm(
  request: Request
): Promise<Map<string, FileUpload | string>> {
  const contentType = request.headers.get('content-type');
  
  if (!contentType || !contentType.includes('multipart/form-data')) {
    throw new Error('Request must be multipart/form-data');
  }

  const formData = await request.formData();
  const result = new Map<string, FileUpload | string>();

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = await value.arrayBuffer();
      result.set(key, {
        filename: value.name,
        contentType: value.type,
        size: value.size,
        buffer,
      });
    } else {
      result.set(key, value);
    }
  }

  return result;
}

/**
 * Create storage service instances
 */
export function createStorageService(bucket: R2Bucket): StorageService {
  return new StorageService(bucket);
}

export function createAssetsStorage(env: Env): StorageService {
  return new StorageService(env.ASSETS);
}

export function createUploadsStorage(env: Env): StorageService {
  return new StorageService(env.UPLOADS);
}
