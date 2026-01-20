/**
 * Shared Crypto Helpers - AES-GCM Encryption/Decryption
 * Uses WebCrypto SubtleCrypto for authenticated encryption
 * 
 * SECURITY: Key must be stored in Secrets as INTEGRATION_ENCRYPTION_KEY
 * Key format: 32-byte key encoded as base64 or hex (64 hex chars)
 */

const IV_LENGTH = 12; // 96 bits - recommended for AES-GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Get and validate the encryption key from environment
 * @returns {Promise<CryptoKey>} The imported AES-GCM key
 * @throws {Error} If key is missing or invalid
 */
export async function getEncryptionKey() {
  const rawKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY');
  
  if (!rawKey) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY not configured in Secrets. Please set a 32-byte key (base64 or 64 hex chars).');
  }

  let keyBytes;
  
  // Try to decode as base64 first
  try {
    const decoded = atob(rawKey);
    if (decoded.length === KEY_LENGTH) {
      keyBytes = new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
    }
  } catch (e) {
    // Not valid base64, continue
  }

  // Try hex decoding if base64 failed
  if (!keyBytes && rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(rawKey.substr(i * 2, 2), 16);
    }
  }

  // If still no key, derive from the raw string (fallback for legacy keys)
  if (!keyBytes) {
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(rawKey);
    const keyHash = await crypto.subtle.digest('SHA-256', keyMaterial);
    keyBytes = new Uint8Array(keyHash);
  }

  if (keyBytes.length !== KEY_LENGTH) {
    throw new Error(`INTEGRATION_ENCRYPTION_KEY must be exactly ${KEY_LENGTH} bytes. Got ${keyBytes.length} bytes.`);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a JSON-serializable object using AES-GCM
 * @param {object} plaintextObj - The object to encrypt
 * @returns {Promise<{iv_b64: string, ciphertext_b64: string}>} Encrypted data
 */
export async function encryptJson(plaintextObj) {
  if (plaintextObj === null || plaintextObj === undefined) {
    throw new Error('Cannot encrypt null or undefined');
  }

  const cryptoKey = await getEncryptionKey();
  const encoder = new TextEncoder();
  const plaintext = JSON.stringify(plaintextObj);
  const plaintextBytes = encoder.encode(plaintext);

  // Generate fresh random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encrypt with AES-GCM (includes authentication tag)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    plaintextBytes
  );

  // Return IV and ciphertext as base64
  return {
    iv_b64: arrayToBase64(iv),
    ciphertext_b64: arrayToBase64(new Uint8Array(ciphertext))
  };
}

/**
 * Decrypt an encrypted object using AES-GCM
 * @param {{iv_b64: string, ciphertext_b64: string}} encryptedData - The encrypted data
 * @returns {Promise<object>} The decrypted object
 */
export async function decryptJson(encryptedData) {
  if (!encryptedData?.iv_b64 || !encryptedData?.ciphertext_b64) {
    throw new Error('Invalid encrypted data: missing iv_b64 or ciphertext_b64');
  }

  const cryptoKey = await getEncryptionKey();
  const iv = base64ToArray(encryptedData.iv_b64);
  const ciphertext = base64ToArray(encryptedData.ciphertext_b64);

  // Decrypt with AES-GCM (verifies authentication tag)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  const plaintext = decoder.decode(decrypted);
  
  return JSON.parse(plaintext);
}

/**
 * Convert Uint8Array to base64 string
 */
function arrayToBase64(arr) {
  return btoa(String.fromCharCode(...arr));
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToArray(b64) {
  const decoded = atob(b64);
  return new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
}