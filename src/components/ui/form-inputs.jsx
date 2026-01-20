import React, { useState, useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Eye, EyeOff, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Enhanced form input with built-in validation, labels, and error states
 */
export function FormInput({
  label,
  error,
  success,
  hint,
  tooltip,
  required,
  className = '',
  inputClassName = '',
  ...props
}) {
  const id = useId();

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id} className={error ? 'text-red-600' : ''}>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
      <div className="relative">
        <Input
          id={id}
          className={`
            ${error ? 'border-red-500 focus:ring-red-500 pr-10' : ''}
            ${success ? 'border-green-500 focus:ring-green-500 pr-10' : ''}
            ${inputClassName}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {error && (
          <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
        )}
        {success && !error && (
          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 flex items-center gap-1">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Password input with show/hide toggle
 */
export function PasswordInput({ label, error, ...props }) {
  const [showPassword, setShowPassword] = useState(false);
  const id = useId();

  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className={error ? 'text-red-600' : ''}>
          {label}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          className={`pr-10 ${error ? 'border-red-500' : ''}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Currency input with formatting
 */
export function CurrencyInput({ label, error, value, onChange, ...props }) {
  const [displayValue, setDisplayValue] = useState(
    value ? Number(value).toLocaleString() : ''
  );

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const num = parseFloat(raw) || 0;
    setDisplayValue(raw ? num.toLocaleString() : '');
    onChange?.(num);
  };

  return (
    <FormInput
      label={label}
      error={error}
      value={displayValue}
      onChange={handleChange}
      inputClassName="pl-7"
      {...props}
    >
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
    </FormInput>
  );
}

/**
 * Phone input with auto-formatting
 */
export function PhoneInput({ label, error, value, onChange, ...props }) {
  const formatPhone = (input) => {
    const cleaned = input.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handleChange = (e) => {
    const formatted = formatPhone(e.target.value);
    onChange?.(formatted);
  };

  return (
    <FormInput
      label={label}
      error={error}
      value={value}
      onChange={handleChange}
      type="tel"
      placeholder="(555) 555-5555"
      {...props}
    />
  );
}

/**
 * SSN input with masking
 */
export function SSNInput({ label, error, value, onChange, masked = true, ...props }) {
  const formatSSN = (input) => {
    const cleaned = input.replace(/\D/g, '').slice(0, 9);
    if (cleaned.length >= 5) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    } else if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const maskSSN = (ssn) => {
    if (!ssn || ssn.length < 4) return ssn;
    return `XXX-XX-${ssn.slice(-4)}`;
  };

  const handleChange = (e) => {
    const formatted = formatSSN(e.target.value);
    onChange?.(formatted);
  };

  return (
    <FormInput
      label={label}
      error={error}
      value={masked && value ? maskSSN(value) : value}
      onChange={handleChange}
      placeholder="XXX-XX-XXXX"
      tooltip="Your Social Security Number is encrypted and stored securely"
      {...props}
    />
  );
}

/**
 * Percentage input
 */
export function PercentInput({ label, error, value, onChange, max = 100, ...props }) {
  const handleChange = (e) => {
    const num = parseFloat(e.target.value) || 0;
    const clamped = Math.min(Math.max(num, 0), max);
    onChange?.(clamped);
  };

  return (
    <div className="space-y-1.5">
      <FormInput
        label={label}
        error={error}
        type="number"
        step="0.125"
        min="0"
        max={max}
        value={value}
        onChange={handleChange}
        inputClassName="pr-8"
        {...props}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
    </div>
  );
}
