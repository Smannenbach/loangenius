import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { calculateLoanAmount, calculateLTV } from './dscr-utils';
import WizardStep from './WizardStep';

export default function Step3Valuation({ data, onChange, onNext, onPrev, loanPurpose }) {
  const isPurchase = loanPurpose === 'Purchase';
  const isRefi = loanPurpose?.includes('Refinance');
  const isCashOut = loanPurpose === 'Cash_Out_Refinance';

  const handleSliderChange = (value) => {
    onChange({ downPaymentPercent: value[0] });
  };

  const handlePurchaseChange = () => {
    if (data.purchasePrice && data.downPaymentPercent) {
      const newLoanAmount = calculateLoanAmount(data.purchasePrice, data.downPaymentPercent);
      onChange({ loanAmount: newLoanAmount });
    }
  };

  const calculateLTVValue = () => {
    if (isPurchase) {
      return calculateLTV(data.loanAmount || 0, data.purchasePrice || 1);
    }
    return calculateLTV(data.loanAmount || 0, data.appraisedValue || 1);
  };

  const isValid = () => {
    if (isPurchase) return data.purchasePrice && data.loanAmount && data.interestRate;
    return data.appraisedValue && data.loanAmount && data.interestRate;
  };

  return (
    <WizardStep
      stepNumber={3}
      title="Valuation & Loan Terms"
      description="Set property value and loan parameters"
      onNext={() => { handlePurchaseChange(); onNext(); }}
      onPrev={onPrev}
      isValid={isValid()}
    >
      <div className="space-y-8">
        {/* Purchase Price / Appraisal */}
        {isPurchase && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Purchase Price *</Label>
              <Input
                type="number"
                placeholder="500000"
                value={data.purchasePrice || ''}
                onChange={(e) => onChange({ purchasePrice: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Appraised Value (optional)</Label>
              <Input
                type="number"
                placeholder="Defaults to purchase price"
                value={data.appraisedValue || ''}
                onChange={(e) => onChange({ appraisedValue: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {isRefi && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Appraised Value *</Label>
              <Input
                type="number"
                placeholder="500000"
                value={data.appraisedValue || ''}
                onChange={(e) => onChange({ appraisedValue: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Existing Loan Balance *</Label>
              <Input
                type="number"
                placeholder="350000"
                value={data.existingLoanBalance || ''}
                onChange={(e) => onChange({ existingLoanBalance: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Down Payment Slider (Purchase Only) */}
         {isPurchase && (
           <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
             <div className="flex justify-between items-center mb-4">
               <Label className="font-semibold text-gray-900">Down Payment</Label>
               <div className="text-right">
                 <div className="text-lg font-bold text-blue-600">{data.downPaymentPercent || 25}%</div>
                 <div className="text-sm text-gray-600">${((data.purchasePrice || 0) * ((data.downPaymentPercent || 25) / 100)).toLocaleString()}</div>
               </div>
             </div>
             <Slider
               value={[data.downPaymentPercent || 25]}
               onValueChange={handleSliderChange}
               min={20}
               max={40}
               step={1}
               className="w-full"
             />
             <p className="text-xs text-gray-600 mt-2">Range: 20% - 40%</p>
           </div>
         )}

        {/* Loan Amount */}
        <div>
          <Label>Loan Amount *</Label>
          <Input
            type="number"
            placeholder="375000"
            value={data.loanAmount || ''}
            onChange={(e) => onChange({ loanAmount: parseFloat(e.target.value) })}
            className="mt-1"
          />
        </div>

        {/* Interest Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Interest Rate (%) *</Label>
            <Input
              type="number"
              placeholder="7.5"
              step="0.01"
              value={data.interestRate || ''}
              onChange={(e) => onChange({ interestRate: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Rate Type</Label>
            <Select value={data.rateType || 'Fixed'} onValueChange={(v) => onChange({ rateType: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixed">Fixed</SelectItem>
                <SelectItem value="ARM_5_1">ARM 5/1</SelectItem>
                <SelectItem value="ARM_7_1">ARM 7/1</SelectItem>
                <SelectItem value="Interest_Only">Interest Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loan Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Loan Term (months)</Label>
            <Select value={(data.loanTermMonths || 360).toString()} onValueChange={(v) => onChange({ loanTermMonths: parseInt(v) })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="120">10 Years (120)</SelectItem>
                <SelectItem value="180">15 Years (180)</SelectItem>
                <SelectItem value="360">30 Years (360)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prepayment Type</Label>
            <Select value={data.prepayType || 'None'} onValueChange={(v) => onChange({ prepayType: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="None">No Prepayment Penalty</SelectItem>
                <SelectItem value="3_2_1">3-2-1</SelectItem>
                <SelectItem value="5_4_3_2_1">5-4-3-2-1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* LTV Display */}
         <Card className={`p-4 border-2 ${calculateLTVValue() > 80 ? 'border-red-200 bg-red-50' : calculateLTVValue() > 75 ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <TrendingUp className={`h-5 w-5 ${calculateLTVValue() > 80 ? 'text-red-600' : calculateLTVValue() > 75 ? 'text-orange-600' : 'text-green-600'}`} />
               <span className="font-semibold text-gray-900">Loan-to-Value (LTV)</span>
             </div>
             <span className={`text-xl font-bold ${calculateLTVValue() > 80 ? 'text-red-600' : calculateLTVValue() > 75 ? 'text-orange-600' : 'text-green-600'}`}>{calculateLTVValue().toFixed(2)}%</span>
           </div>
           {calculateLTVValue() > 80 && (
             <div className="flex items-start gap-2 mt-2 p-2 bg-white rounded border border-red-200">
               <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
               <p className="text-xs text-red-700 font-medium">High LTV - May impact loan qualification</p>
             </div>
           )}
           {isCashOut && calculateLTVValue() > 75 && calculateLTVValue() <= 80 && (
             <div className="flex items-start gap-2 mt-2 p-2 bg-white rounded border border-orange-200">
               <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
               <p className="text-xs text-orange-700 font-medium">LTV exceeds standard DSCR limit (75%)</p>
             </div>
           )}
         </Card>
      </div>
    </WizardStep>
  );
}