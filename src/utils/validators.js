/**
 * Form validation utilities for loan application forms
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
};

/**
 * Validate phone number (US format)
 * @param {string} phone
 * @param {boolean} required
 * @returns {{ valid: boolean, error?: string }}
 */
export const validatePhone = (phone, required = false) => {
  if (!phone) {
    return required
      ? { valid: false, error: 'Phone number is required' }
      : { valid: true };
  }
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 10) {
    return { valid: false, error: 'Phone number must be at least 10 digits' };
  }
  if (cleaned.length > 11) {
    return { valid: false, error: 'Phone number is too long' };
  }
  return { valid: true };
};

/**
 * Validate SSN format
 * @param {string} ssn
 * @param {boolean} required
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateSSN = (ssn, required = false) => {
  if (!ssn) {
    return required
      ? { valid: false, error: 'SSN is required' }
      : { valid: true };
  }
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    return { valid: false, error: 'SSN must be exactly 9 digits' };
  }
  // Check for invalid SSNs (000, 666, 900-999 in first 3 digits)
  const first3 = cleaned.substring(0, 3);
  if (first3 === '000' || first3 === '666' || parseInt(first3) >= 900) {
    return { valid: false, error: 'Invalid SSN' };
  }
  return { valid: true };
};

/**
 * Validate ZIP code (US format)
 * @param {string} zip
 * @param {boolean} required
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateZip = (zip, required = false) => {
  if (!zip) {
    return required
      ? { valid: false, error: 'ZIP code is required' }
      : { valid: true };
  }
  const cleaned = zip.replace(/\D/g, '');
  if (cleaned.length !== 5 && cleaned.length !== 9) {
    return { valid: false, error: 'ZIP code must be 5 or 9 digits' };
  }
  return { valid: true };
};

/**
 * Validate loan amount within range
 * @param {number|string} amount
 * @param {number} min
 * @param {number} max
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateLoanAmount = (amount, min = 50000, max = 50000000) => {
  if (!amount) return { valid: false, error: 'Loan amount is required' };

  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount;

  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a valid amount' };
  }
  if (num < min) {
    return { valid: false, error: `Minimum loan amount is $${min.toLocaleString()}` };
  }
  if (num > max) {
    return { valid: false, error: `Maximum loan amount is $${max.toLocaleString()}` };
  }
  return { valid: true };
};

/**
 * Validate interest rate
 * @param {number|string} rate
 * @param {number} min
 * @param {number} max
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateInterestRate = (rate, min = 0, max = 25) => {
  if (!rate && rate !== 0) return { valid: true }; // Optional field

  const num = typeof rate === 'string' ? parseFloat(rate) : rate;

  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a valid rate' };
  }
  if (num < min) {
    return { valid: false, error: `Rate cannot be less than ${min}%` };
  }
  if (num > max) {
    return { valid: false, error: `Rate cannot exceed ${max}%` };
  }
  return { valid: true };
};

/**
 * Validate LTV ratio
 * @param {number} loanAmount
 * @param {number} propertyValue
 * @param {number} maxLTV
 * @returns {{ valid: boolean, error?: string, ltv?: number }}
 */
export const validateLTV = (loanAmount, propertyValue, maxLTV = 80) => {
  if (!loanAmount || !propertyValue) {
    return { valid: true }; // Can't validate without both values
  }

  const ltv = (loanAmount / propertyValue) * 100;

  if (ltv > maxLTV) {
    return {
      valid: false,
      error: `LTV of ${ltv.toFixed(1)}% exceeds maximum of ${maxLTV}%`,
      ltv
    };
  }
  if (ltv > 100) {
    return {
      valid: false,
      error: 'Loan amount cannot exceed property value',
      ltv
    };
  }
  return { valid: true, ltv };
};

/**
 * Validate DSCR ratio
 * @param {number} noi - Net Operating Income (annual)
 * @param {number} debtService - Annual debt service
 * @param {number} minDSCR
 * @returns {{ valid: boolean, error?: string, dscr?: number }}
 */
export const validateDSCR = (noi, debtService, minDSCR = 1.0) => {
  if (!noi || !debtService) {
    return { valid: true }; // Can't validate without both values
  }

  const dscr = noi / debtService;

  if (dscr < minDSCR) {
    return {
      valid: false,
      error: `DSCR of ${dscr.toFixed(2)} is below minimum of ${minDSCR.toFixed(2)}`,
      dscr
    };
  }
  return { valid: true, dscr };
};

/**
 * Validate FICO score
 * @param {number|string} score
 * @param {number} minScore
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFICO = (score, minScore = 620) => {
  if (!score) return { valid: true }; // Optional

  const num = typeof score === 'string' ? parseInt(score) : score;

  if (isNaN(num)) {
    return { valid: false, error: 'Please enter a valid credit score' };
  }
  if (num < 300 || num > 850) {
    return { valid: false, error: 'Credit score must be between 300 and 850' };
  }
  if (num < minScore) {
    return { valid: false, error: `Credit score must be at least ${minScore}` };
  }
  return { valid: true };
};

/**
 * Validate required field
 * @param {any} value
 * @param {string} fieldName
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
};

/**
 * Validate date is not in the past
 * @param {string|Date} date
 * @param {string} fieldName
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateFutureDate = (date, fieldName = 'Date') => {
  if (!date) return { valid: true };

  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (d < today) {
    return { valid: false, error: `${fieldName} cannot be in the past` };
  }
  return { valid: true };
};

/**
 * Validate a form object against a schema
 * @param {object} data - Form data
 * @param {object} schema - Validation schema { fieldName: validatorFn }
 * @returns {{ valid: boolean, errors: object }}
 */
export const validateForm = (data, schema) => {
  const errors = {};
  let valid = true;

  for (const [field, validator] of Object.entries(schema)) {
    const result = validator(data[field], data);
    if (!result.valid) {
      errors[field] = result.error;
      valid = false;
    }
  }

  return { valid, errors };
};

/**
 * Create a validator that checks if value is one of allowed options
 * @param {array} options - Allowed values
 * @param {string} fieldName
 * @returns {function}
 */
export const validateOneOf = (options, fieldName = 'This field') => {
  return (value) => {
    if (!value) return { valid: true };
    if (!options.includes(value)) {
      return { valid: false, error: `${fieldName} must be one of: ${options.join(', ')}` };
    }
    return { valid: true };
  };
};

/**
 * Combine multiple validators
 * @param {...function} validators
 * @returns {function}
 */
export const composeValidators = (...validators) => {
  return (value, allValues) => {
    for (const validator of validators) {
      const result = validator(value, allValues);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
};
