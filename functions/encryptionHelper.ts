/**
 * Encryption helper for sensitive fields (SSN, DOB, EIN)
 * Uses AES-256-GCM with org-specific keys stored in environment
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte hex string
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // bytes
const AUTH_TAG_LENGTH = 16; // bytes

/**
 * Encrypt a sensitive value
 * @param {string} plaintext - Value to encrypt
 * @returns {string} - Base64-encoded ciphertext with IV and auth tag prepended
 */
export function encrypt(plaintext) {
  if (!plaintext) return null;
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: IV (hex) + authTag (hex) + ciphertext (hex)
  const combined = iv.toString('hex') + authTag.toString('hex') + encrypted;
  return Buffer.from(combined, 'hex').toString('base64');
}

/**
 * Decrypt a sensitive value
 * @param {string} encrypted - Base64-encoded ciphertext
 * @returns {string} - Decrypted plaintext
 */
export function decrypt(encrypted) {
  if (!encrypted) return null;
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const combined = Buffer.from(encrypted, 'base64').toString('hex');
  
  const iv = Buffer.from(combined.slice(0, IV_LENGTH * 2), 'hex');
  const authTag = Buffer.from(
    combined.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2),
    'hex'
  );
  const ciphertext = combined.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Mask sensitive field for logging (SSN → ***-**-1234)
 * @param {string} fieldName - Field name
 * @param {string} value - Value to mask
 * @returns {string} - Masked value
 */
export function maskSensitiveField(fieldName, value) {
  if (!value) return '[REDACTED]';
  
  const field = fieldName.toLowerCase();
  const str = String(value);
  
  if (field === 'ssn' || field === 'social_security_number') {
    return `***-**-${str.slice(-4)}`;
  }
  if (field === 'ein' || field === 'tax_id') {
    return `**-***${str.slice(-4)}`;
  }
  if (field === 'email') {
    const [local, domain] = str.split('@');
    return `${local[0]}***@${domain}`;
  }
  if (field === 'phone') {
    return str.replace(/\d(?=\d{4})/g, '*');
  }
  if (field === 'password' || field === 'secret' || field === 'token') {
    return '[REDACTED]';
  }
  if (field === 'bank_account' || field === 'account_number') {
    return `****${str.slice(-4)}`;
  }
  
  return value;
}

/**
 * Check if field should be encrypted
 * @param {string} fieldName
 * @returns {boolean}
 */
export function shouldEncrypt(fieldName) {
  const sensitiveFields = [
    'ssn', 'social_security_number',
    'dob', 'date_of_birth',
    'ein', 'tax_id',
    'bank_account', 'account_number',
    'credit_card',
    'drivers_license',
    'password', 'secret'
  ];
  return sensitiveFields.includes(fieldName.toLowerCase());
}