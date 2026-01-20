import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DollarSign } from 'lucide-react';

/**
 * Format a number as currency string
 */
function formatCurrency(value, options = {}) {
  const { locale = 'en-US', currency = 'USD', decimals = 0 } = options;

  if (value === null || value === undefined || value === '') return '';

  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(num)) return '';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Parse currency string to number
 */
function parseCurrency(value) {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Format number with commas for display while typing
 */
function formatWithCommas(value) {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? value.replace(/[^0-9]/g, '') : String(value);
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Currency Input Component
 *
 * @param {Object} props
 * @param {number} props.value - The numeric value
 * @param {Function} props.onChange - Callback with numeric value
 * @param {string} props.placeholder - Input placeholder
 * @param {number} props.min - Minimum value
 * @param {number} props.max - Maximum value
 * @param {boolean} props.allowDecimals - Allow decimal values
 * @param {boolean} props.showSymbol - Show currency symbol
 * @param {boolean} props.disabled - Disable input
 * @param {string} props.className - Additional CSS classes
 */
export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  min,
  max,
  allowDecimals = false,
  showSymbol = true,
  disabled = false,
  className,
  id,
  name,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Sync display value with prop value
  useEffect(() => {
    if (!isFocused) {
      if (value !== null && value !== undefined && value !== '') {
        setDisplayValue(formatWithCommas(value));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e) => {
    let inputValue = e.target.value;

    // Allow only numbers, commas, and optionally decimals
    const regex = allowDecimals ? /[^0-9.,]/g : /[^0-9,]/g;
    inputValue = inputValue.replace(regex, '');

    // Remove existing commas for processing
    const rawValue = inputValue.replace(/,/g, '');

    // Handle decimals
    let numericValue;
    if (allowDecimals) {
      numericValue = parseFloat(rawValue);
    } else {
      numericValue = parseInt(rawValue, 10);
    }

    // Validate against min/max
    if (!isNaN(numericValue)) {
      if (min !== undefined && numericValue < min) numericValue = min;
      if (max !== undefined && numericValue > max) numericValue = max;
    }

    // Format display with commas
    setDisplayValue(formatWithCommas(rawValue));

    // Call onChange with numeric value
    if (onChange) {
      onChange(isNaN(numericValue) ? null : numericValue);
    }
  }, [onChange, allowDecimals, min, max]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Reformat on blur
    if (value !== null && value !== undefined && value !== '') {
      setDisplayValue(formatWithCommas(value));
    }
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      {showSymbol && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <DollarSign className="h-4 w-4 text-gray-400" />
        </div>
      )}
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(showSymbol && 'pl-9')}
        {...props}
      />
    </div>
  );
}

/**
 * Percentage Input Component
 */
export function PercentageInput({
  value,
  onChange,
  placeholder = '0',
  min = 0,
  max = 100,
  decimals = 2,
  disabled = false,
  className,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      if (value !== null && value !== undefined && value !== '') {
        setDisplayValue(String(value));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e) => {
    let inputValue = e.target.value;

    // Allow only numbers and decimal point
    inputValue = inputValue.replace(/[^0-9.]/g, '');

    // Only allow one decimal point
    const parts = inputValue.split('.');
    if (parts.length > 2) {
      inputValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit decimal places
    if (parts.length === 2 && parts[1].length > decimals) {
      inputValue = parts[0] + '.' + parts[1].slice(0, decimals);
    }

    let numericValue = parseFloat(inputValue);

    // Validate against min/max
    if (!isNaN(numericValue)) {
      if (min !== undefined && numericValue < min) numericValue = min;
      if (max !== undefined && numericValue > max) numericValue = max;
    }

    setDisplayValue(inputValue);

    if (onChange) {
      onChange(isNaN(numericValue) ? null : numericValue);
    }
  }, [onChange, min, max, decimals]);

  return (
    <div className={cn('relative', className)}>
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-8"
        {...props}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <span className="text-gray-400 text-sm">%</span>
      </div>
    </div>
  );
}

/**
 * Phone Number Input Component
 */
export function PhoneInput({
  value,
  onChange,
  placeholder = '(555) 123-4567',
  disabled = false,
  className,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value) {
      setDisplayValue(formatPhoneNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const formatPhoneNumber = (input) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);

    if (match) {
      let formatted = '';
      if (match[1]) formatted = `(${match[1]}`;
      if (match[1]?.length === 3) formatted += ') ';
      if (match[2]) formatted += match[2];
      if (match[2]?.length === 3 && match[3]) formatted += '-';
      if (match[3]) formatted += match[3];
      return formatted;
    }
    return input;
  };

  const handleChange = (e) => {
    const input = e.target.value;
    const cleaned = input.replace(/\D/g, '').slice(0, 10);
    const formatted = formatPhoneNumber(cleaned);

    setDisplayValue(formatted);

    if (onChange) {
      onChange(cleaned);
    }
  };

  return (
    <Input
      type="tel"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      {...props}
    />
  );
}

/**
 * SSN Input Component (masked)
 */
export function SSNInput({
  value,
  onChange,
  placeholder = '***-**-****',
  masked = true,
  disabled = false,
  className,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (value) {
      if (masked && !showFull) {
        // Show only last 4
        const cleaned = value.replace(/\D/g, '');
        setDisplayValue(`***-**-${cleaned.slice(-4)}`);
      } else {
        setDisplayValue(formatSSN(value));
      }
    } else {
      setDisplayValue('');
    }
  }, [value, masked, showFull]);

  const formatSSN = (input) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,4})$/);

    if (match) {
      let formatted = '';
      if (match[1]) formatted = match[1];
      if (match[1]?.length === 3 && match[2]) formatted += '-' + match[2];
      if (match[2]?.length === 2 && match[3]) formatted += '-' + match[3];
      return formatted;
    }
    return input;
  };

  const handleChange = (e) => {
    const input = e.target.value;
    const cleaned = input.replace(/\D/g, '').slice(0, 9);
    const formatted = formatSSN(cleaned);

    setDisplayValue(formatted);
    setShowFull(true);

    if (onChange) {
      onChange(cleaned);
    }
  };

  const handleBlur = () => {
    if (masked) {
      setShowFull(false);
    }
  };

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onFocus={() => setShowFull(true)}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      autoComplete="off"
      {...props}
    />
  );
}

export { formatCurrency, parseCurrency };
