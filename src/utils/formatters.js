/**
 * Formatting utilities for consistent display across the application
 */

/**
 * Format a number as US currency
 * @param {number} value - The value to format
 * @param {boolean} compact - Whether to use compact notation (1.2M instead of 1,200,000)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, compact = false) => {
  if (value === null || value === undefined) return '$0';

  const num = Number(value);
  if (isNaN(num)) return '$0';

  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(num);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Format a date for display
 * @param {string|Date} date - The date to format
 * @param {string} format - The format style: 'short', 'medium', 'long', 'relative'
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'medium') => {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
    case 'medium':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    case 'relative':
      return formatRelativeDate(d);
    default:
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

/**
 * Format a date as relative time (e.g., "2 days ago", "in 3 hours")
 * @param {Date} date - The date to format
 * @returns {string} Relative time string
 */
export const formatRelativeDate = (date) => {
  const now = new Date();
  const diffMs = date - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffDay) >= 7) {
    return formatDate(date, 'medium');
  }

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffDay) >= 1) return rtf.format(diffDay, 'day');
  if (Math.abs(diffHour) >= 1) return rtf.format(diffHour, 'hour');
  if (Math.abs(diffMin) >= 1) return rtf.format(diffMin, 'minute');
  return 'just now';
};

/**
 * Format a phone number for display
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phone;
};

/**
 * Format a percentage for display
 * @param {number} value - The percentage value (0-100 or 0-1)
 * @param {number} decimals - Number of decimal places
 * @param {boolean} isDecimal - Whether the input is already a decimal (0.75 vs 75)
 * @returns {string} Formatted percentage string
 */
export const formatPercent = (value, decimals = 1, isDecimal = false) => {
  if (value === null || value === undefined) return '0%';

  let num = Number(value);
  if (isNaN(num)) return '0%';

  if (isDecimal) num *= 100;

  return `${num.toFixed(decimals)}%`;
};

/**
 * Format a number with thousands separators
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined) return '0';

  const num = Number(value);
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Truncate text with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Format file size for display
 * @param {number} bytes - The file size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
};

/**
 * Mask SSN for display (show last 4 digits only)
 * @param {string} ssn - The SSN to mask
 * @returns {string} Masked SSN (XXX-XX-1234)
 */
export const maskSSN = (ssn) => {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length < 4) return '***-**-****';
  return `***-**-${cleaned.slice(-4)}`;
};

/**
 * Format SSN for display (with dashes)
 * @param {string} ssn - The SSN to format
 * @returns {string} Formatted SSN (123-45-6789)
 */
export const formatSSN = (ssn) => {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) return ssn;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

/**
 * Format a loan number for display
 * @param {string|number} number - The loan number
 * @param {string} prefix - Optional prefix (e.g., 'LG-')
 * @returns {string} Formatted loan number
 */
export const formatLoanNumber = (number, prefix = 'LG-') => {
  if (!number) return '';
  const num = String(number).replace(/\D/g, '');
  return `${prefix}${num.padStart(6, '0')}`;
};

/**
 * Format a full address from components
 * @param {object} address - Address object with street, city, state, zip
 * @returns {string} Formatted address
 */
export const formatAddress = ({ street, city, state, zip, unit } = {}) => {
  const parts = [];
  if (street) parts.push(street);
  if (unit) parts[0] = `${parts[0]} ${unit}`;
  if (city || state || zip) {
    const cityStateZip = [city, state].filter(Boolean).join(', ');
    parts.push(zip ? `${cityStateZip} ${zip}` : cityStateZip);
  }
  return parts.join(', ');
};

/**
 * Format LTV ratio for display
 * @param {number} loanAmount - The loan amount
 * @param {number} propertyValue - The property value
 * @returns {string} Formatted LTV percentage
 */
export const formatLTV = (loanAmount, propertyValue) => {
  if (!loanAmount || !propertyValue || propertyValue === 0) return '0%';
  const ltv = (loanAmount / propertyValue) * 100;
  return `${ltv.toFixed(1)}%`;
};

/**
 * Format DSCR ratio for display
 * @param {number} noi - Net Operating Income
 * @param {number} debtService - Annual debt service
 * @returns {string} Formatted DSCR
 */
export const formatDSCR = (noi, debtService) => {
  if (!noi || !debtService || debtService === 0) return '0.00';
  const dscr = noi / debtService;
  return dscr.toFixed(2);
};

/**
 * Format an interest rate for display
 * @param {number} rate - The interest rate (as percentage, e.g., 7.5)
 * @returns {string} Formatted rate
 */
export const formatInterestRate = (rate) => {
  if (rate === null || rate === undefined) return '0.000%';
  const num = Number(rate);
  if (isNaN(num)) return '0.000%';
  return `${num.toFixed(3)}%`;
};

/**
 * Calculate and format monthly payment (P&I)
 * @param {number} principal - Loan principal
 * @param {number} annualRate - Annual interest rate (as percentage)
 * @param {number} termYears - Loan term in years
 * @returns {string} Formatted monthly payment
 */
export const calculateMonthlyPayment = (principal, annualRate, termYears = 30) => {
  if (!principal || !annualRate) return '$0';

  const monthlyRate = (annualRate / 100) / 12;
  const numPayments = termYears * 12;

  if (monthlyRate === 0) return formatCurrency(principal / numPayments);

  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                  (Math.pow(1 + monthlyRate, numPayments) - 1);

  return formatCurrency(payment);
};

/**
 * Pluralize a word based on count
 * @param {number} count - The count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} Pluralized string with count
 */
export const pluralize = (count, singular, plural) => {
  const num = Number(count) || 0;
  const word = num === 1 ? singular : (plural || `${singular}s`);
  return `${num} ${word}`;
};
