/**
 * Cryptographic utilities
 */

/**
 * Generate a secure random string
 */
export function generateRandomString(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash a password using SHA-256
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const actualSalt = salt || generateRandomString(16);
  const encoder = new TextEncoder();
  const data = encoder.encode(password + actualSalt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${actualSalt}$${hashHex}`;
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt] = hash.split('$');
  const hashedPassword = await hashPassword(password, salt);
  return hashedPassword === hash;
}

/**
 * Hash a string using SHA-256
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate HMAC signature
 */
export async function generateHmac(
  message: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  
  const signatureArray = Array.from(new Uint8Array(signature));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify HMAC signature
 */
export async function verifyHmac(
  message: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await generateHmac(message, secret);
  return expected === signature;
}

/**
 * Encode data as base64
 */
export function base64Encode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' 
    ? new TextEncoder().encode(data)
    : data;
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Decode base64 data
 */
export function base64Decode(data: string): Uint8Array {
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
