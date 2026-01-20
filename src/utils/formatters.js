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
