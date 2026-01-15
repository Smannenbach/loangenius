/**
 * Signed URL service for secure file access
 * Uses time-limited tokens to gate access to private files
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate a signed URL for downloading a file
 */
export async function generateSignedUrl(base44, fileId, expiresInSeconds = 3600) {
  try {
    // In production, integrate with S3/GCS/Azure Blob signed URL generation
    // For now, use the platform's built-in CreateFileSignedUrl (if available)

    const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
      file_uri: fileId,
      expires_in: expiresInSeconds,
    });

    return signedUrl.signed_url;
  } catch (error) {
    console.error('Signed URL generation failed:', error);
    throw new Error('Failed to generate download link');
  }
}

/**
 * Upload a file and return a private URI
 */
export async function uploadPrivateFile(base44, file) {
  try {
    const result = await base44.integrations.Core.UploadPrivateFile({
      file,
    });

    return result.file_uri;
  } catch (error) {
    console.error('Private file upload failed:', error);
    throw new Error('File upload failed');
  }
}

/**
 * Upload a public file (for logos, templates, etc.)
 */
export async function uploadPublicFile(base44, file) {
  try {
    const result = await base44.integrations.Core.UploadFile({
      file,
    });

    return result.file_url;
  } catch (error) {
    console.error('Public file upload failed:', error);
    throw new Error('File upload failed');
  }
}