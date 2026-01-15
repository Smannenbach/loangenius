/**
 * Format phone number with country code
 * @param {string} phone - Raw phone number
 * @param {string} countryCode - Country code (e.g., "+1")
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone, countryCode = '+1') => {
  if (!phone) return '';
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Remove leading 1 if country code is +1
  let cleaned = digits;
  if (countryCode === '+1' && digits.startsWith('1')) {
    cleaned = digits.slice(1);
  }
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `${countryCode} (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length > 10) {
    return `${countryCode} ${cleaned}`;
  }
  
  return `${countryCode} ${cleaned}`;
};

/**
 * Extract digits from formatted phone number
 * @param {string} phone - Formatted phone number
 * @returns {string} Digits only
 */
export const extractPhoneDigits = (phone) => {
  return (phone || '').replace(/\D/g, '');
};

/**
 * Validate email address
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export const validateEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (digits only)
 * @param {string} phone - Phone number digits
 * @returns {boolean} True if valid
 */
export const validatePhone = (phone) => {
  const digits = extractPhoneDigits(phone);
  return digits.length >= 10 && digits.length <= 15;
};

/**
 * Country codes list
 */
export const COUNTRY_CODES = [
  { code: '+1', country: 'United States' },
  { code: '+1', country: 'Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+61', country: 'Australia' },
  { code: '+64', country: 'New Zealand' },
  { code: '+33', country: 'France' },
  { code: '+49', country: 'Germany' },
  { code: '+39', country: 'Italy' },
  { code: '+34', country: 'Spain' },
  { code: '+31', country: 'Netherlands' },
  { code: '+46', country: 'Sweden' },
  { code: '+47', country: 'Norway' },
  { code: '+45', country: 'Denmark' },
  { code: '+41', country: 'Switzerland' },
  { code: '+43', country: 'Austria' },
  { code: '+48', country: 'Poland' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+852', country: 'Hong Kong' },
  { code: '+65', country: 'Singapore' },
];