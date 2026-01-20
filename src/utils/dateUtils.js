/**
 * Date and time utility functions for loan origination
 */

/**
 * Format a date for display
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Format a date with time
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date and time string
 */
export function formatDateTime(date) {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format time only
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime(date) {
  return formatDate(date, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
  if (Math.abs(diffWeek) < 4) return rtf.format(diffWeek, 'week');
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month');

  return formatDate(d);
}

/**
 * Get the start of a day
 * @param {Date|string} date - Date
 * @returns {Date} Start of day
 */
export function startOfDay(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of a day
 * @param {Date|string} date - Date
 * @returns {Date} End of day
 */
export function endOfDay(date) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Add business days to a date (skips weekends)
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of business days to add
 * @returns {Date} New date
 */
export function addBusinessDays(date, days) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;

  while (remaining > 0) {
    d.setDate(d.getDate() + direction);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      remaining--;
    }
  }

  return d;
}

/**
 * Calculate the difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
export function diffInDays(date1, date2) {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate business days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of business days
 */
export function diffInBusinessDays(date1, date2) {
  const d1 = startOfDay(date1);
  const d2 = startOfDay(date2);

  let count = 0;
  const current = new Date(d1);

  while (current < d2) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++;
    }
  }

  return count;
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export function isPast(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d < new Date();
}

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the future
 */
export function isFuture(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d > new Date();
}

/**
 * Check if a date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is within N days from now
 * @param {Date|string} date - Date to check
 * @param {number} days - Number of days
 * @returns {boolean} True if date is within range
 */
export function isWithinDays(date, days) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const future = addDays(now, days);
  return d >= now && d <= future;
}

/**
 * Format a date range
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {string} Formatted range string
 */
export function formatDateRange(start, end) {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);

  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) {
      // Same month: "Jan 1-15, 2024"
      return `${formatDate(s, { month: 'short', day: 'numeric' })}-${e.getDate()}, ${e.getFullYear()}`;
    }
    // Same year: "Jan 1 - Feb 15, 2024"
    return `${formatDate(s, { month: 'short', day: 'numeric' })} - ${formatDate(e, { month: 'short', day: 'numeric' })}, ${e.getFullYear()}`;
  }
  // Different years: "Jan 1, 2023 - Feb 15, 2024"
  return `${formatDate(s)} - ${formatDate(e)}`;
}

/**
 * Get TRID deadline (3 business days for Closing Disclosure)
 * @param {Date|string} closingDate - Closing date
 * @returns {Date} CD must be delivered by this date
 */
export function getTRIDDeadline(closingDate) {
  return addBusinessDays(closingDate, -3);
}

/**
 * Check if date meets TRID timing requirement
 * @param {Date|string} cdSentDate - Date CD was sent
 * @param {Date|string} closingDate - Scheduled closing date
 * @returns {boolean} True if TRID timing is met
 */
export function meetsTRIDRequirement(cdSentDate, closingDate) {
  const businessDays = diffInBusinessDays(cdSentDate, closingDate);
  return businessDays >= 3;
}

/**
 * Get date presets for filters
 * @returns {Array} Array of preset options
 */
export function getDatePresets() {
  const today = new Date();

  return [
    {
      label: 'Today',
      value: 'today',
      start: startOfDay(today),
      end: endOfDay(today),
    },
    {
      label: 'Yesterday',
      value: 'yesterday',
      start: startOfDay(addDays(today, -1)),
      end: endOfDay(addDays(today, -1)),
    },
    {
      label: 'This Week',
      value: 'this_week',
      start: startOfDay(addDays(today, -today.getDay())),
      end: endOfDay(today),
    },
    {
      label: 'Last 7 Days',
      value: 'last_7_days',
      start: startOfDay(addDays(today, -6)),
      end: endOfDay(today),
    },
    {
      label: 'This Month',
      value: 'this_month',
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: endOfDay(today),
    },
    {
      label: 'Last 30 Days',
      value: 'last_30_days',
      start: startOfDay(addDays(today, -29)),
      end: endOfDay(today),
    },
    {
      label: 'This Quarter',
      value: 'this_quarter',
      start: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1),
      end: endOfDay(today),
    },
    {
      label: 'This Year',
      value: 'this_year',
      start: new Date(today.getFullYear(), 0, 1),
      end: endOfDay(today),
    },
  ];
}

/**
 * Parse a date string from ISO or common formats
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;

  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try MM/DD/YYYY format
  const mdyMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return null;
}
