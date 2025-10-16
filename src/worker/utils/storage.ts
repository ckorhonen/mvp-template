/**
 * R2 Storage utility functions
 */

import { Env, UploadOptions, FileUpload, AppError } from '../types';
import { Logger } from './logger';

export class Storage {
  private bucket: R2Bucket;
  private logger: Logger;

  constructor(bucket: R2Bucket, logger: Logger) {
    this.bucket = bucket;
    this.logger = logger;
  }

  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    options?: UploadOptions
  ): Promise<FileUpload> {
    try {
      this.logger.debug('Uploading file to R2', { key });

      const object = await this.bucket.put(key, data, options);

      if (!object) {
        throw new Error('Upload failed');
      }

      this.logger.info('File uploaded successfully', {
        key,
        size: object.size,
        etag: object.etag,
      });

      return {
        key: object.key,
        size: object.size,
        etag: object.etag,
        uploaded: object.uploaded,
      };
    } catch (error) {
      this.logger.error('R2 upload failed', error);
      throw new AppError(
        'STORAGE_UPLOAD_ERROR',
        'Failed to upload file',
        500,
        { error: (error as Error).message, key }
      );
    }
  }

  /**
   * Download a file from R2
   */
  async download(key: string): Promise<R2ObjectBody | null> {
    try {
      this.logger.debug('Downloading file from R2', { key });
      const object = await this.bucket.get(key);

      if (object) {
        this.logger.info('File downloaded successfully', {
          key,
          size: object.size,
        });
      }

      return object;
    } catch (error) {
      this.logger.error('R2 download failed', error);
      throw new AppError(
        'STORAGE_DOWNLOAD_ERROR',
        'Failed to download file',
        500,
        { error: (error as Error).message, key }
      );
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    try {
      this.logger.debug('Deleting file from R2', { key });
      await this.bucket.delete(key);
      this.logger.info('File deleted successfully', { key });
    } catch (error) {
      this.logger.error('R2 delete failed', error);
      throw new AppError(
        'STORAGE_DELETE_ERROR',
        'Failed to delete file',
        500,
        { error: (error as Error).message, key }
      );
    }
  }

  /**
   * List files in R2 bucket
   */
  async list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ keys: string[]; cursor?: string; truncated: boolean }> {
    try {
      const result = await this.bucket.list(options);
      
      return {
        keys: result.objects.map(obj => obj.key),
        cursor: result.cursor,
        truncated: result.truncated,
      };
    } catch (error) {
      this.logger.error('R2 list failed', error);
      throw new AppError(
        'STORAGE_LIST_ERROR',
        'Failed to list files',
        500,
        { error: (error as Error).message }
      );
    }
  }

  /**
   * Get file metadata
   */
  async head(key: string): Promise<R2Object | null> {
    try {
      return await this.bucket.head(key);
    } catch (error) {
      this.logger.error('R2 head failed', error);
      throw new AppError(
        'STORAGE_HEAD_ERROR',
        'Failed to get file metadata',
        500,
        { error: (error as Error).message, key }
      );
    }
  }

  /**
   * Generate a presigned URL for temporary access
   */
  generatePresignedUrl(key: string, expiresIn: number = 3600): string {
    // Note: R2 presigned URLs are not directly supported yet
    // This is a placeholder for when the feature becomes available
    // For now, you would use a custom endpoint with time-limited tokens
    this.logger.warn('R2 presigned URLs not yet implemented', { key });
    return `https://your-worker.workers.dev/download/${key}?token=placeholder`;
  }
}
