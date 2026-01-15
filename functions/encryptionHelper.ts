/**
 * Field-level encryption helper for SSN, DOB, EIN
 * Uses Web Crypto API (async)
 */

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

if (!ENCRYPTION_KEY) {
  console.warn('ENCRYPTION_KEY not set - encryption disabled');
}

/**
 * Encrypt a sensitive field
 */
export async function encryptField(plaintext) {
  if (!plaintext || !ENCRYPTION_KEY) return plaintext;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

    // Return IV + ciphertext as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Field encryption failed');
  }
}

/**
 * Decrypt a sensitive field
 */
export async function decryptField(ciphertext) {
  if (!ciphertext || !ENCRYPTION_KEY) return ciphertext;

  try {
    const encoder = new TextEncoder();
    const combined = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Field decryption failed');
  }
}

/**
 * Mask a sensitive field for display (e.g., XXX-XX-1234)
 */
export function maskSSN(ssn) {
  if (!ssn || ssn.length < 4) return ssn;
  return 'XXX-XX-' + ssn.slice(-4);
}

export function maskEIN(ein) {
  if (!ein || ein.length < 4) return ein;
  return 'XX-' + ein.slice(-7);
}