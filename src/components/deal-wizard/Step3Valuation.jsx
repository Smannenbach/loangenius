import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Step3Valuation({ data, onChange, onNext, onPrev, loanPurpose }) {
  const rateTypes = ['Fixed', 'ARM', 'Interest Only', 'Bridge'];
  const loanTerms = [
    { value: '360', label: '30 Years (360)' },
    { value: '180', label: '15 Years (180)' },
    { value: '120', label: '10 Years (120)' },
  ];
  const prepaymentTypes = ['No Prepayment Penalty', '5-4-3-2-1', '3-2-1', 'Other'];

  const ltv = useMemo(() => {
    const loan = parseFloat(data.loanAmount) || 0;
    const value = parseFloat(data.appraisedValue || data.purchasePrice) || 0;
    if (value === 0) return 0;
    return ((loan / value) * 100).toFixed(2);
  }, [data.loanAmount, data.appraisedValue, data.purchasePrice]);

  const canProceed = data.loanAmount && data.interestRate;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          4
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Valuation & Loan Terms</h2>
          <p className="text-gray-600 mt-1">Set property value and loan parameters</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Loan Amount *</Label>
              <Input
                type="number"
                placeholder="375000"
                value={data.loanAmount}
                onChange={(e) => onChange({ loanAmount: e.target.value })}
                className="text-lg"
              />
            </div>

            {loanPurpose === 'Purchase' && (
              <div className="space-y-2">
                <Label className="text-gray-700">Purchase Price</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={data.purchasePrice}
                  onChange={(e) => onChange({ purchasePrice: e.target.value })}
                />
              </div>
            )}

            {loanPurpose !== 'Purchase' && (
              <div className="space-y-2">
                <Label className="text-gray-700">Appraised Value</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={data.appraisedValue}
                  onChange={(e) => onChange({ appraisedValue: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Interest Rate (%) *</Label>
              <Input
                type="number"
                step="0.125"
                placeholder="7.5"
                value={data.interestRate}
                onChange={(e) => onChange({ interestRate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Rate Type</Label>
              <Select
                value={data.rateType}
                onValueChange={(v) => onChange({ rateType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rateTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Loan Term (months)</Label>
              <Select
                value={data.loanTermMonths?.toString()}
                onValueChange={(v) => onChange({ loanTermMonths: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loanTerms.map((term) => (
                    <SelectItem key={term.value} value={term.value}>{term.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Prepayment Type</Label>
              <Select
                value={data.prepaymentType}
                onValueChange={(v) => onChange({ prepaymentType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {prepaymentTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* LTV Display */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Loan-to-Value (LTV):</span>
              <span className="text-2xl font-bold text-blue-600">{ltv}%</span>
            </div>
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