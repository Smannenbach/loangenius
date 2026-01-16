import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from 'lucide-react';

export default function Step1LoanType({ data, onChange, onNext, onPrev }) {
  const loanTypes = [
    { 
      value: 'DSCR', 
      label: 'DSCR',
      description: 'Debt Service Coverage Ratio' 
    },
    { 
      value: 'DSCR - No Ratio', 
      label: 'DSCR No-Ratio',
      description: 'Flexible qualification' 
    },
    { 
      value: 'DSCR Blanket', 
      label: 'DSCR Blanket',
      description: 'Multi-property portfolio' 
    },
  ];

  const loanPurposes = [
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Rate & Term Refinance', label: 'Rate & Term Refinance' },
    { value: 'Cash-Out Refinance', label: 'Cash-Out Refinance' },
    { value: 'Second Mortgage', label: 'Second Mortgage' },
    { value: 'HELOC', label: 'HELOC' },
  ];

  const handleLoanTypeSelect = (type) => {
    onChange({ 
      loanType: type,
      isBlanket: type === 'DSCR Blanket'
    });
  };

  const canProceed = data.loanType && data.loanPurpose;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          2
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Loan Type & Purpose</h2>
          <p className="text-gray-600 mt-1">Select the loan type and purpose</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-8">
          {/* Loan Type */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-gray-900">Loan Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loanTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleLoanTypeSelect(type.value)}
                  className={`relative p-5 rounded-lg border-2 text-left transition-all ${
                    data.loanType === type.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {data.loanType === type.value && (
                    <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="font-semibold text-gray-900 mb-1">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Loan Purpose */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-gray-900">Loan Purpose</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {loanPurposes.map((purpose) => (
                <button
                  key={purpose.value}
                  onClick={() => onChange({ loanPurpose: purpose.value })}
                  className={`p-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    data.loanPurpose === purpose.value
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {purpose.label}
                </button>
              ))}
            </div>
          </div>

          {/* Blanket Checkbox */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="blanket"
              checked={data.isBlanket}
              onCheckedChange={(checked) => onChange({ 
                isBlanket: checked,
                loanType: checked ? 'DSCR Blanket' : 'DSCR'
              })}
            />
            <label htmlFor="blanket" className="text-sm text-gray-700 cursor-pointer">
              This is a blanket/portfolio loan (multiple properties)
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrev}>
          ← Previous
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!canProceed}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}