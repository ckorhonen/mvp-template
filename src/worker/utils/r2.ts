/**
 * R2 storage utilities
 * Provides type-safe file upload, download, and management for R2 buckets
 */

import { Logger } from './logger';

export interface R2UploadOptions {
  /** Content type of the file */
  contentType?: string;
  /** Custom metadata */
  customMetadata?: Record<string, string>;
  /** HTTP metadata */
  httpMetadata?: R2HTTPMetadata;
}

export interface R2DownloadOptions {
  /** Return only specific byte range */
  range?: R2Range;
  /** Only return file if it matches condition */
  onlyIf?: R2Conditional;
}

/**
 * R2 Storage Manager
 */
export class R2Storage {
  private bucket: R2Bucket;
  private logger?: Logger;

  constructor(bucket: R2Bucket, logger?: Logger) {
    this.bucket = bucket;
    this.logger = logger;
  }

  /**
   * Upload a file to R2
   */
  async upload(
    key: string,
    data: ReadableStream | ArrayBuffer | string,
    options: R2UploadOptions = {}
  ): Promise<R2Object | null> {
    try {
      this.logger?.info('Uploading file to R2', { key });

      const result = await this.bucket.put(key, data, {
        httpMetadata: options.httpMetadata || {
          contentType: options.contentType || 'application/octet-stream',
        },
        customMetadata: options.customMetadata,
      });

      this.logger?.info('File uploaded successfully', { key, size: result?.size });
      return result;
    } catch (error) {
      this.logger?.error('Failed to upload file', error, { key });
      throw error;
    }
  }

  /**
   * Download a file from R2
   */
  async download(
    key: string,
    options: R2DownloadOptions = {}
  ): Promise<R2ObjectBody | null> {
    try {
      this.logger?.debug('Downloading file from R2', { key });

      const object = await this.bucket.get(key, options);

      if (!object) {
        this.logger?.warn('File not found', { key });
        return null;
      }

      this.logger?.debug('File downloaded successfully', { key, size: object.size });
      return object;
    } catch (error) {
      this.logger?.error('Failed to download file', error, { key });
      throw error;
    }
  }

  /**
   * Get file metadata without downloading content
   */
  async head(key: string): Promise<R2Object | null> {
    try {
      return await this.bucket.head(key);
    } catch (error) {
      this.logger?.error('Failed to get file metadata', error, { key });
      throw error;
    }
  }

  /**
   * Delete a file from R2
   */
  async delete(key: string): Promise<void> {
    try {
      this.logger?.info('Deleting file from R2', { key });
      await this.bucket.delete(key);
      this.logger?.info('File deleted successfully', { key });
    } catch (error) {
      this.logger?.error('Failed to delete file', error, { key });
      throw error;
    }
  }

  /**
   * Delete multiple files from R2
   */
  async deleteMultiple(keys: string[]): Promise<void> {
    try {
      this.logger?.info('Deleting multiple files from R2', { count: keys.length });
      await this.bucket.delete(keys);
      this.logger?.info('Files deleted successfully', { count: keys.length });
    } catch (error) {
      this.logger?.error('Failed to delete multiple files', error, { count: keys.length });
      throw error;
    }
  }

  /**
   * List files in bucket
   */
  async list(
    options: R2ListOptions = {}
  ): Promise<R2Objects> {
    try {
      return await this.bucket.list(options);
    } catch (error) {
      this.logger?.error('Failed to list files', error);
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  async exists(key: string): Promise<boolean> {
    const object = await this.head(key);
    return object !== null;
  }

  /**
   * Generate a signed URL for temporary public access
   * Note: This is a placeholder - Cloudflare R2 doesn't natively support signed URLs yet
   * You would need to implement this using Cloudflare Access or custom auth
   */
  generateSignedUrl(key: string, expiresIn: number): string {
    // This is a placeholder implementation
    // In production, you'd implement proper signed URL generation
    this.logger?.warn('generateSignedUrl is not yet implemented for R2');
    return `https://your-r2-bucket.com/${key}`;
  }

  /**
   * Copy a file within the bucket
   */
  async copy(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      this.logger?.info('Copying file in R2', { sourceKey, destinationKey });
      
      const source = await this.download(sourceKey);
      if (!source) {
        throw new Error(`Source file not found: ${sourceKey}`);
      }

      await this.upload(destinationKey, source.body, {
        contentType: source.httpMetadata?.contentType,
        customMetadata: source.customMetadata,
      });

      this.logger?.info('File copied successfully', { sourceKey, destinationKey });
    } catch (error) {
      this.logger?.error('Failed to copy file', error, { sourceKey, destinationKey });
      throw error;
    }
  }

  /**
   * Move a file within the bucket
   */
  async move(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copy(sourceKey, destinationKey);
    await this.delete(sourceKey);
  }
}

/**
 * Create an R2 storage manager
 */
export function createR2Storage(bucket: R2Bucket, logger?: Logger): R2Storage {
  return new R2Storage(bucket, logger);
}
