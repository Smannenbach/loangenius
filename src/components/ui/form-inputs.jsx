import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, DollarSign, Phone, AlertCircle } from 'lucide-react';

// Base form input with label and error
export function FormInput({ 
  label, 
  error, 
  required, 
  className, 
  helpText,
  ...props 
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input 
        className={cn(
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        {...props}
      />
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Currency input with formatting
export function CurrencyInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required,
  placeholder = '0.00',
  ...props 
}) {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value]);

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const parseCurrency = (str) => {
    const cleaned = str.replace(/[^0-9.-]/g, '');
    return cleaned ? parseFloat(cleaned) : 0;
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const parsed = parseCurrency(raw);
    setDisplayValue(formatCurrency(parsed));
    onChange?.(parsed);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          type="text"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "pl-9",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Phone input with formatting
export function PhoneInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required,
  placeholder = '(555) 555-5555',
  ...props 
}) {
  const formatPhone = (input) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (!match) return input;
    
    let formatted = '';
    if (match[1]) formatted = `(${match[1]}`;
    if (match[1]?.length === 3) formatted += ') ';
    if (match[2]) formatted += match[2];
    if (match[2]?.length === 3) formatted += '-';
    if (match[3]) formatted += match[3];
    
    return formatted;
  };

  const handleChange = (e) => {
    const formatted = formatPhone(e.target.value);
    onChange?.(formatted);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input 
          type="tel"
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={14}
          className={cn(
            "pl-9",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// SSN input with masking
export function SSNInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required,
  ...props 
}) {
  const [showFull, setShowFull] = useState(false);

  const formatSSN = (input) => {
    const cleaned = input.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,2})(\d{0,4})$/);
    if (!match) return input;
    
    let formatted = '';
    if (match[1]) formatted = match[1];
    if (match[1]?.length === 3) formatted += '-';
    if (match[2]) formatted += match[2];
    if (match[2]?.length === 2) formatted += '-';
    if (match[3]) formatted += match[3];
    
    return formatted;
  };

  const maskSSN = (ssn) => {
    if (!ssn || ssn.length < 7) return ssn;
    return `XXX-XX-${ssn.slice(-4)}`;
  };

  const handleChange = (e) => {
    const formatted = formatSSN(e.target.value);
    onChange?.(formatted);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input 
          type="text"
          value={showFull ? (value || '') : maskSSN(value || '')}
          onChange={handleChange}
          placeholder="XXX-XX-XXXX"
          maxLength={11}
          className={cn(
            "pr-10",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowFull(!showFull)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showFull ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// Percentage input
export function PercentageInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required,
  min = 0,
  max = 100,
  step = 0.125,
  ...props 
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input 
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className={cn(
            "pr-8",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          %
        </span>
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}