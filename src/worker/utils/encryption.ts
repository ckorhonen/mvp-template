/**
 * Encryption Utility Functions
 * Helper functions for hashing and encryption
 */

/**
 * Generate a SHA-256 hash of a string
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Constant-time string comparison
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate an API key
 */
export function generateAPIKey(prefix: string = 'mvp'): string {
  const randomPart = generateRandomString(32);
  return `${prefix}_${randomPart}`;
}

/**
 * Hash an API key for storage
 */
export async function hashAPIKey(key: string): Promise<string> {
  return await sha256(key);
}
