/**
 * Signed URL service for secure file access
 * Uses AWS S3 URL signing with expiration
 */

import crypto from 'crypto';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BUCKET = process.env.S3_BUCKET || 'loangenius-files';
const REGION = process.env.AWS_REGION || 'us-west-2';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;

/**
 * Generate a signed S3 URL for file download
 * @param {string} fileKey - S3 object key (path)
 * @param {number} expiresIn - Expiration in seconds (default: 3600 = 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export async function generateSignedDownloadUrl(fileKey, expiresIn = 3600) {
  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error('AWS credentials not configured');
  }

  const service = 's3';
  const host = `${BUCKET}.s3.${REGION}.amazonaws.com`;
  const algorithm = 'AWS4-HMAC-SHA256';
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  const credentialScope = `${dateStamp}/${REGION}/${service}/aws4_request`;

  // Build canonical request
  const canonicalRequest = [
    'GET',
    `/${fileKey}`,
    '',
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    '',
    'host;x-amz-date',
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // Build string to sign
  const canonicalRequestHash = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex');
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  // Calculate signature
  const kDate = hmac(`AWS4${S3_SECRET_KEY}`, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = hmac(kSigning, stringToSign, 'hex');

  // Build query string
  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': `${S3_ACCESS_KEY}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
    'X-Amz-Signature': signature
  });

  return `https://${host}/${fileKey}?${queryParams.toString()}`;
}

/**
 * Generate signed upload URL (POST policy)
 * @param {string} fileKey - S3 object key
 * @param {number} expiresIn - Expiration in seconds
 * @returns {Promise<Object>} - Upload URL and form fields
 */
export async function generateSignedUploadUrl(fileKey, expiresIn = 3600) {
  const expiration = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  const policy = {
    expiration,
    conditions: [
      { bucket: BUCKET },
      { key: fileKey },
      ['content-length-range', 0, 524288000], // 500MB max
      { acl: 'private' }
    ]
  };

  const policyB64 = Buffer.from(JSON.stringify(policy)).toString('base64');
  const signature = crypto
    .createHmac('sha1', S3_SECRET_KEY)
    .update(policyB64)
    .digest('base64');

  return {
    url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/`,
    fields: {
      key: fileKey,
      acl: 'private',
      policy: policyB64,
      'X-Amz-Signature': signature,
      'X-Amz-Credential': S3_ACCESS_KEY
    }
  };
}

/**
 * Verify that file access is org-scoped
 * @param {string} fileKey - S3 key
 * @param {string} orgId - Organization ID
 * @returns {boolean}
 */
export function isFileOrgScoped(fileKey, orgId) {
  // File keys should follow pattern: /orgs/{orgId}/files/{...}
  return fileKey.startsWith(`/orgs/${orgId}/files/`);
}

// Helper: HMAC
function hmac(key, message, encoding = undefined) {
  const hmacObj = crypto.createHmac('sha256', key);
  hmacObj.update(message);
  return encoding ? hmacObj.digest(encoding) : hmacObj.digest();
}