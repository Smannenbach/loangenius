import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import WizardStep from './WizardStep';

export default function Step1LoanType({ data, onChange, onNext, onPrev }) {
  const loanTypes = [
    { value: 'DSCR', label: 'DSCR', description: 'Debt Service Coverage Ratio' },
    { value: 'DSCR_No_Ratio', label: 'DSCR No-Ratio', description: 'Flexible qualification' },
    { value: 'DSCR_Blanket', label: 'DSCR Blanket', description: 'Multi-property portfolio' },
  ];

  const purposes = [
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Rate_Term_Refinance', label: 'Rate & Term Refinance' },
    { value: 'Cash_Out_Refinance', label: 'Cash-Out Refinance' },
    { value: 'Second_Mortgage', label: 'Second Mortgage' },
    { value: 'HELOC', label: 'HELOC' },
  ];

  const isValid = data.loanType && data.loanPurpose;

  return (
    <WizardStep
      stepNumber={1}
      title="Loan Type & Purpose"
      description="Select the loan type and purpose"
      onNext={onNext}
      onPrev={onPrev}
      isValid={isValid}
    >
      <div className="space-y-8">
        {/* Loan Type */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">Loan Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loanTypes.map(type => (
              <button
                key={type.value}
                onClick={() => !type.disabled && onChange({ loanType: type.value })}
                disabled={type.disabled}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  data.loanType === type.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${type.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-semibold text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-500 mt-1">{type.description}</div>
                {type.disabled && <Badge className="mt-2 bg-gray-200 text-gray-700">Coming Soon</Badge>}
              </button>
            ))}
          </div>
        </div>

        {/* Loan Purpose */}
        <div>
          <Label className="text-lg font-semibold mb-4 block">Loan Purpose</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {purposes.map(purpose => (
              <button
                key={purpose.value}
                onClick={() => onChange({ loanPurpose: purpose.value })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  data.loanPurpose === purpose.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } cursor-pointer`}
              >
                <div className="font-semibold text-gray-900">{purpose.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Blanket Loan Toggle */}
        <div className="pt-4 border-t">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.isBlanket || false}
              onChange={(e) => onChange({ isBlanket: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <span className="text-gray-900 font-medium">This is a blanket/portfolio loan (multiple properties)</span>
          </label>
        </div>
      </div>
    </WizardStep>
  );
}