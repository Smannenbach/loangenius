/**
 * Application-wide constants
 * Centralized to avoid magic numbers scattered throughout the codebase
 */

// Polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  MESSAGING: 8000,        // Portal secure messaging
  NOTIFICATIONS: 30000,   // Notification checks
  PIPELINE: 60000,        // Pipeline refresh
};

// Token expiration (in milliseconds)
export const TOKEN_EXPIRY = {
  OTP: 10 * 60 * 1000,           // 10 minutes
  MAGIC_LINK: 24 * 60 * 60 * 1000,  // 24 hours (was 7 days - too long)
  SESSION: 30 * 60 * 1000,       // 30 minutes idle timeout
  REFRESH: 7 * 24 * 60 * 60 * 1000, // 7 days refresh token
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  LEADS_PER_PAGE: 25,
  LOANS_PER_PAGE: 25,
  DOCUMENTS_PER_PAGE: 50,
};

// File upload limits
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
  MAX_FILES_PER_UPLOAD: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOC_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Debounce delays (in milliseconds)
export const DEBOUNCE = {
  SEARCH: 300,
  FORM_SAVE: 500,
  RESIZE: 150,
};

// Loan calculation constants
export const LOAN_CONSTANTS = {
  MONTHS_PER_YEAR: 12,
  DEFAULT_TERM_MONTHS: 360, // 30 years
  MIN_FICO_SCORE: 300,
  MAX_FICO_SCORE: 850,
  MIN_LTV: 0,
  MAX_LTV: 100,
  MIN_DTI: 0,
  MAX_DTI: 100,
};

// Rate limiting
export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: 5,
  OTP_REQUESTS_PER_HOUR: 5,
  API_REQUESTS_PER_MINUTE: 60,
};

// UI constants
export const UI = {
  TOAST_DURATION: 5000,
  MODAL_ANIMATION_MS: 200,
  MIN_TOUCH_TARGET_PX: 44, // WCAG requirement
  TRUNCATE_LENGTH: 50,
};

// Deal stages for pipeline
export const DEAL_STAGES = [
  'lead',
  'application',
  'processing',
  'underwriting',
  'conditional_approval',
  'clear_to_close',
  'closing',
  'funded',
  'cancelled',
];

// Lead sources
export const LEAD_SOURCES = [
  'website',
  'referral',
  'zillow',
  'realtor',
  'cold_call',
  'marketing',
  'repeat_customer',
  'other',
];

export default {
  POLLING_INTERVALS,
  TOKEN_EXPIRY,
  PAGINATION,
  FILE_LIMITS,
  DEBOUNCE,
  LOAN_CONSTANTS,
  RATE_LIMITS,
  UI,
  DEAL_STAGES,
  LEAD_SOURCES,
};
