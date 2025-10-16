/**
 * Cryptography Utilities
 * 
 * Helper functions for hashing, encryption, and token generation.
 */

/**
 * Hash a string using SHA-256
 */
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  return `sk_${generateToken(32)}`;
}

/**
 * Hash password or API key for storage
 */
export async function hashSecret(secret: string, salt?: string): Promise<string> {
  const saltValue = salt || generateToken(16);
  const combined = `${secret}:${saltValue}`;
  const hashed = await sha256(combined);
  return `${saltValue}:${hashed}`;
}

/**
 * Verify a secret against its hash
 */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  const [salt, expectedHash] = hash.split(':');
  const combined = `${secret}:${salt}`;
  const actualHash = await sha256(combined);
  return actualHash === expectedHash;
}

/**
 * Constant-time string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
