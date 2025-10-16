/**
 * R2 Storage Utility Functions
 * Helpers for working with Cloudflare R2 storage
 */

import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * Upload options
 */
export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  httpMetadata?: R2HTTPMetadata;
}

/**
 * Upload a file to R2
 */
export async function uploadFile(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer | ReadableStream | string,
  options?: UploadOptions
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: options?.httpMetadata || {
      contentType: options?.contentType,
    },
    customMetadata: options?.customMetadata,
  });
}

/**
 * Download a file from R2
 */
export async function downloadFile(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(key);
}

/**
 * Check if a file exists
 */
export async function fileExists(
  bucket: R2Bucket,
  key: string
): Promise<boolean> {
  const object = await bucket.head(key);
  return object !== null;
}

/**
 * Delete a file from R2
 */
export async function deleteFile(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key);
}

/**
 * Delete multiple files
 */
export async function deleteFiles(
  bucket: R2Bucket,
  keys: string[]
): Promise<void> {
  await bucket.delete(keys);
}

/**
 * List files with optional prefix
 */
export async function listFiles(
  bucket: R2Bucket,
  prefix?: string,
  limit?: number
): Promise<R2Object[]> {
  const result = await bucket.list({ prefix, limit });
  return result.objects;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  bucket: R2Bucket,
  key: string
): Promise<R2Object | null> {
  return await bucket.head(key);
}

/**
 * Generate a pre-signed URL (using R2 public bucket or custom domain)
 */
export function getPublicUrl(
  bucketUrl: string,
  key: string
): string {
  return `${bucketUrl}/${key}`;
}

/**
 * Upload JSON data
 */
export async function uploadJSON<T = unknown>(
  bucket: R2Bucket,
  key: string,
  data: T,
  options?: Omit<UploadOptions, 'contentType'>
): Promise<void> {
  await uploadFile(bucket, key, JSON.stringify(data), {
    ...options,
    contentType: 'application/json',
  });
}

/**
 * Download and parse JSON data
 */
export async function downloadJSON<T = unknown>(
  bucket: R2Bucket,
  key: string
): Promise<T | null> {
  const object = await downloadFile(bucket, key);
  if (!object) return null;

  const text = await object.text();
  return JSON.parse(text) as T;
}
