import { WorkerError } from '../types';

/**
 * R2 Storage utility functions
 * https://developers.cloudflare.com/r2/
 */

export class StorageManager {
  constructor(private bucket: R2Bucket) {}

  /**
   * Upload a file to R2
   */
  async put(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    options?: R2PutOptions
  ): Promise<R2Object> {
    try {
      const object = await this.bucket.put(key, data, options);
      
      if (!object) {
        throw new WorkerError(
          'Failed to upload file to R2',
          500,
          'R2_UPLOAD_ERROR',
          { key }
        );
      }

      return object;
    } catch (error) {
      if (error instanceof WorkerError) {
        throw error;
      }
      throw new WorkerError(
        'R2 upload operation failed',
        500,
        'R2_OPERATION_ERROR',
        { key, originalError: error }
      );
    }
  }

  /**
   * Download a file from R2
   */
  async get(key: string): Promise<R2ObjectBody | null> {
    try {
      return await this.bucket.get(key);
    } catch (error) {
      throw new WorkerError(
        'R2 download operation failed',
        500,
        'R2_DOWNLOAD_ERROR',
        { key, originalError: error }
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
      throw new WorkerError(
        'R2 delete operation failed',
        500,
        'R2_DELETE_ERROR',
        { key, originalError: error }
      );
    }
  }

  /**
   * Check if a file exists in R2
   */
  async exists(key: string): Promise<boolean> {
    const object = await this.bucket.head(key);
    return object !== null;
  }

  /**
   * List files in R2 with optional prefix
   */
  async list(
    prefix?: string,
    limit?: number
  ): Promise<R2Objects> {
    try {
      return await this.bucket.list({
        prefix,
        limit,
      });
    } catch (error) {
      throw new WorkerError(
        'R2 list operation failed',
        500,
        'R2_LIST_ERROR',
        { prefix, originalError: error }
      );
    }
  }

  /**
   * Generate a presigned URL for R2 object
   */
  async createPresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    // Note: R2 presigned URLs require additional setup
    // This is a placeholder for custom implementation
    throw new WorkerError(
      'Presigned URLs require additional configuration',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Upload file with metadata
   */
  async putWithMetadata(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    metadata: Record<string, string>,
    contentType?: string
  ): Promise<R2Object> {
    return await this.put(key, data, {
      customMetadata: metadata,
      httpMetadata: contentType ? { contentType } : undefined,
    });
  }
}
