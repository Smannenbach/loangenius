/**
 * Shared Configuration Constants
 * Centralizes magic numbers and configuration values
 */

export const CONFIG = {
  // Token/Session Expiry
  MAGIC_LINK_EXPIRY_MS: 24 * 60 * 60 * 1000,      // 24 hours
  SESSION_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,     // 7 days
  OTP_EXPIRY_MS: 10 * 60 * 1000,                   // 10 minutes
  
  // File Limits
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,          // 50MB
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,          // 5MB
  
  // Rate Limiting
  AUTH_RATE_LIMIT_REQUESTS: 5,
  AUTH_RATE_LIMIT_WINDOW_MS: 60 * 1000,           // 1 minute
  
  // Pagination
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  
  // Allowed Origins (for redirect validation)
  ALLOWED_ORIGINS: [
    'https://app.loangenius.com',
    'https://portal.loangenius.com',
    'https://loangenius.base44.app'
  ],
  
  // Default Values
  DEFAULT_LOAN_TERM_MONTHS: 360,
  DEFAULT_INTEREST_RATE_STEP: 0.125,
};

/**
 * Validate origin against allowlist
 */
export function validateOrigin(origin, fallback = 'https://app.loangenius.com') {
  if (origin && CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return fallback;
}

/**
 * Calculate expiry timestamp
 */
export function calculateExpiry(durationMs) {
  return new Date(Date.now() + durationMs).toISOString();
}