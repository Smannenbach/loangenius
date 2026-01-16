import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, TrendingUp } from 'lucide-react';

const LOAN_PURPOSES = [
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Rate & Term', label: 'Rate & Term Refinance' },
  { value: 'Cash-Out', label: 'Cash-Out Refinance' },
  { value: 'Delayed Financing', label: 'Delayed Financing' },
];

const PROPERTY_TYPES = [
  { value: 'SFR', label: 'Single Family Residence (SFR)' },
  { value: 'PUD Detached', label: 'PUD Detached' },
  { value: 'PUD Attached', label: 'PUD Attached' },
  { value: 'Condo', label: 'Condo (Warrantable)' },
  { value: 'Condo (Non-Warrantable)', label: 'Condo (Non-Warrantable)' },
  { value: '2-4 Units', label: '2-4 Units' },
  { value: 'Log Home', label: 'Log Home' },
  { value: '3D Printed Home', label: '3D Printed Home' },
  { value: 'Container Home', label: 'Container Home' },
  { value: 'Tiny Home', label: 'Tiny Home' },
  { value: '5+ Units', label: '5+ Units (Multifamily)' },
  { value: 'Mixed Use (51% Residential)', label: 'Mixed Use (51%+ Residential)' },
  { value: 'Other', label: 'Other (specify)' },
];

const AMORTIZATION_OPTIONS = [
  { id: 'fixed', label: 'Fixed Rate' },
  { id: 'arm', label: 'ARM' },
  { id: 'io', label: 'Interest Only' },
  { id: 'bridge', label: 'Bridge' },
];

export default function BPAStep1LoanInfo({ formData, updateFormData, errors, calculateLTV }) {
  const formatCurrency = (value) => {
    if (!value) return '';
    const num = value.toString().replace(/[^0-9.]/g, '');
    return num;
  };

  return (
    <div className="space-y-8">
      {/* Loan Purpose */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Loan Purpose <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={formData.loan_purpose}
          onValueChange={(v) => updateFormData({ loan_purpose: v })}
          className="grid grid-cols-2 gap-3"
        >
          {LOAN_PURPOSES.map((purpose) => (
            <div key={purpose.value} className="flex items-center space-x-2">
              <RadioGroupItem value={purpose.value} id={`purpose-${purpose.value}`} />
              <Label htmlFor={`purpose-${purpose.value}`} className="cursor-pointer">
                {purpose.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {errors.loan_purpose && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.loan_purpose}
          </p>
        )}
      </div>

      {/* Occupancy (locked for DSCR) */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Occupancy</Label>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
          <span className="font-medium">Investment Property</span>
          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
            Locked for DSCR
          </span>
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Property Type <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.property_type}
          onValueChange={(v) => updateFormData({ property_type: v })}
        >
          <SelectTrigger className={errors.property_type ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select property type" />
          </SelectTrigger>
          <SelectContent>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.property_type === 'Other' && (
          <Input
            placeholder="Please specify property type"
            value={formData.other_property_type_text}
            onChange={(e) => updateFormData({ other_property_type_text: e.target.value })}
            className={errors.other_property_type_text ? 'border-red-500' : ''}
          />
        )}
        {errors.property_type && (
          <p className="text-red-500 text-sm flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {errors.property_type}
          </p>
        )}
      </div>

      {/* Interest Rate */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Interest Rate (%)</Label>
        <Input
          type="number"
          step="0.125"
          min="0"
          max="25"
          placeholder="e.g., 7.500"
          value={formData.interest_rate}
          onChange={(e) => updateFormData({ interest_rate: e.target.value })}
        />
        <p className="text-xs text-gray-500">Optional at application stage (0.000 - 25.000%)</p>
      </div>

      {/* Amortization Type */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Amortization Type</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AMORTIZATION_OPTIONS.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <Checkbox
                id={`amort-${option.id}`}
                checked={
                  option.id === 'fixed' ? formData.amortization_type === 'fixed' :
                  option.id === 'arm' ? formData.is_arm :
                  option.id === 'io' ? formData.is_interest_only :
                  formData.is_bridge
                }
                onCheckedChange={(checked) => {
                  if (option.id === 'fixed') {
                    updateFormData({ amortization_type: checked ? 'fixed' : '' });
                  } else if (option.id === 'arm') {
                    updateFormData({ is_arm: checked });
                  } else if (option.id === 'io') {
                    updateFormData({ is_interest_only: checked });
                  } else {
                    updateFormData({ is_bridge: checked });
                  }
                }}
              />
              <Label htmlFor={`amort-${option.id}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Interest Only Options */}
      {formData.is_interest_only && (
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="font-semibold">Interest Only Period (months)</Label>
          <Input
            type="number"
            min="0"
            max="360"
            placeholder="e.g., 60"
            value={formData.interest_only_period_months}
            onChange={(e) => updateFormData({ interest_only_period_months: e.target.value })}
          />
        </div>
      )}

      {/* ARM Options */}
      {formData.is_arm && (
        <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <Label className="font-semibold">ARM Details</Label>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Index</Label>
              <Input
                placeholder="e.g., SOFR"
                value={formData.arm_index}
                onChange={(e) => updateFormData({ arm_index: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Margin (%)</Label>
              <Input
                type="number"
                step="0.125"
                placeholder="e.g., 2.75"
                value={formData.arm_margin}
                onChange={(e) => updateFormData({ arm_margin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Caps</Label>
              <Input
                placeholder="e.g., 2/2/5"
                value={formData.arm_caps}
                onChange={(e) => updateFormData({ arm_caps: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bridge Options */}
      {formData.is_bridge && (
        <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <Label className="font-semibold">Bridge Exit Strategy</Label>
          <Select
            value={formData.bridge_exit_strategy}
            onValueChange={(v) => updateFormData({ bridge_exit_strategy: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select exit strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sale">Sale</SelectItem>
              <SelectItem value="Refi">Refinance</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Loan Amount & Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Requested Loan Amount <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              type="number"
              className={`pl-7 ${errors.loan_amount ? 'border-red-500' : ''}`}
              placeholder="500,000"
              value={formData.loan_amount}
              onChange={(e) => updateFormData({ loan_amount: formatCurrency(e.target.value) })}
            />
          </div>
          {errors.loan_amount && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {errors.loan_amount}
            </p>
          )}
        </div>

        {formData.loan_purpose === 'Purchase' && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Purchase Price <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                className={`pl-7 ${errors.purchase_price ? 'border-red-500' : ''}`}
                placeholder="650,000"
                value={formData.purchase_price}
                onChange={(e) => updateFormData({ purchase_price: formatCurrency(e.target.value) })}
              />
            </div>
            {errors.purchase_price && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {errors.purchase_price}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base font-semibold">Appraised Value</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              type="number"
              className="pl-7"
              placeholder="700,000"
              value={formData.appraised_value}
              onChange={(e) => updateFormData({ appraised_value: formatCurrency(e.target.value) })}
            />
          </div>
          <p className="text-xs text-gray-500">Optional at application stage</p>
        </div>
      </div>

      {/* LTV Preview */}
      {(formData.loan_amount && (formData.purchase_price || formData.appraised_value)) && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          <div>
            <div className="text-sm text-gray-600">Estimated LTV</div>
            <div className="text-2xl font-bold text-blue-700">{calculateLTV()}%</div>
          </div>
        </div>
      )}
    </div>
  );
}