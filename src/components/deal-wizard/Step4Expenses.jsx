import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { calculateSinglePropertyDSCR } from './dscr-utils';
import WizardStep from './WizardStep';

export default function Step4Expenses({ data, onChange, onNext, onPrev }) {
  const [expandPITIA, setExpandPITIA] = React.useState(false);

  const dscrResult = useMemo(() => {
    if (!data.loanAmount || !data.interestRate || !data.monthlyRent || !data.propertyTaxesAnnual || !data.insuranceAnnual) {
      return null;
    }

    return calculateSinglePropertyDSCR({
      loanAmount: data.loanAmount,
      interestRate: data.interestRate,
      loanTermMonths: data.loanTermMonths || 360,
      amortizationMonths: data.loanTermMonths || 360,
      monthlyRent: Math.min(data.currentLeaseRent || 99999, data.marketRent || 99999),
      propertyTaxesAnnual: data.propertyTaxesAnnual || 0,
      insuranceAnnual: data.insuranceAnnual || 0,
      floodInsuranceAnnual: data.floodInsuranceAnnual || 0,
      hoaDuesMonthly: data.hoaDuesMonthly || 0,
    });
  }, [data]);

  const isValid = data.monthlyRent && data.propertyTaxesAnnual && data.insuranceAnnual;

  const dscrColor = dscrResult
    ? dscrResult.dscrRatio >= 1.25
      ? 'text-green-600'
      : dscrResult.dscrRatio >= 1.0
      ? 'text-yellow-600'
      : 'text-red-600'
    : 'text-gray-600';

  return (
    <WizardStep
      stepNumber={4}
      title="Rental Income & Expenses"
      description="Enter property income and monthly obligations"
      onNext={onNext}
      onPrev={onPrev}
      isValid={isValid}
    >
      <div className="space-y-6">
        {/* Rental Income */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label>Current Lease Rent ($ per month) *</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={data.currentLeaseRent || ''}
              onChange={(e) => onChange({ currentLeaseRent: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Market Rent ($ per month)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={data.marketRent || ''}
              onChange={(e) => onChange({ marketRent: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Rent Used for DSCR</Label>
            <Input
              type="number"
              placeholder="Auto-calculated"
              value={data.monthlyRent || ''}
              onChange={(e) => onChange({ monthlyRent: parseFloat(e.target.value) })}
              className="mt-1"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Lesser of lease/market</p>
          </div>
        </div>

        {/* Expenses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Annual Property Taxes *</Label>
            <Input
              type="number"
              placeholder="Enter annual amount"
              value={data.propertyTaxesAnnual || ''}
              onChange={(e) => onChange({ propertyTaxesAnnual: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Annual Home Insurance *</Label>
            <Input
              type="number"
              placeholder="Enter annual amount"
              value={data.insuranceAnnual || ''}
              onChange={(e) => onChange({ insuranceAnnual: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Annual Flood Insurance</Label>
            <Input
              type="number"
              placeholder="Enter annual amount or 0"
              value={data.floodInsuranceAnnual || ''}
              onChange={(e) => onChange({ floodInsuranceAnnual: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Monthly HOA Dues</Label>
            <Input
              type="number"
              placeholder="Enter monthly amount or 0"
              value={data.hoaDuesMonthly || ''}
              onChange={(e) => onChange({ hoaDuesMonthly: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Live DSCR Display */}
         {dscrResult && (
           <Card className={`p-6 border-2 ${dscrResult.qualifiesStandard ? 'border-green-300 bg-green-50' : dscrResult.qualifies ? 'border-yellow-300 bg-yellow-50' : 'border-red-300 bg-red-50'}`}>
             <div className="mb-6 flex items-start justify-between">
               <div>
                 <p className="text-sm text-gray-700 font-medium">Debt Service Coverage Ratio</p>
                 <p className={`text-5xl font-bold mt-1 ${dscrResult.qualifiesStandard ? 'text-green-600' : dscrResult.qualifies ? 'text-yellow-600' : 'text-red-600'}`}>
                   {dscrResult.dscrRatio.toFixed(2)}
                 </p>
               </div>
               <div className={`p-3 rounded-lg ${dscrResult.qualifiesStandard ? 'bg-green-100' : dscrResult.qualifies ? 'bg-yellow-100' : 'bg-red-100'}`}>
                 {dscrResult.qualifiesStandard ? (
                   <CheckCircle2 className="h-8 w-8 text-green-600" />
                 ) : dscrResult.qualifies ? (
                   <AlertCircle className="h-8 w-8 text-yellow-600" />
                 ) : (
                   <AlertCircle className="h-8 w-8 text-red-600" />
                 )}
               </div>
             </div>

             <div className={`p-3 rounded-lg mb-4 ${dscrResult.qualifiesStandard ? 'bg-white border border-green-200' : dscrResult.qualifies ? 'bg-white border border-yellow-200' : 'bg-white border border-red-200'}`}>
               <p className={`text-sm font-semibold ${dscrResult.qualifiesStandard ? 'text-green-700' : dscrResult.qualifies ? 'text-yellow-700' : 'text-red-700'}`}>
                 {dscrResult.qualifiesStandard ? '✓ Strong Qualification (1.25+ Ratio)' : dscrResult.qualifies ? '⚠️ Marginal Qualification (1.0+ Ratio)' : '✗ Does Not Qualify'}
               </p>
             </div>

             <button
               onClick={() => setExpandPITIA(!expandPITIA)}
               className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
             >
               {expandPITIA ? '▼' : '▶'} Monthly Payment Breakdown
             </button>

             {expandPITIA && (
               <div className="mt-4 pt-4 border-t space-y-2 text-sm bg-white p-3 rounded">
                 <div className="flex justify-between"><span className="text-gray-700">Principal & Interest:</span><span className="font-semibold">${dscrResult.monthlyPI.toFixed(2)}</span></div>
                 <div className="flex justify-between"><span className="text-gray-700">Property Taxes:</span><span className="font-semibold">${dscrResult.monthlyTaxes.toFixed(2)}</span></div>
                 <div className="flex justify-between"><span className="text-gray-700">Home Insurance:</span><span className="font-semibold">${dscrResult.monthlyInsurance.toFixed(2)}</span></div>
                 {dscrResult.monthlyFlood > 0 && <div className="flex justify-between"><span className="text-gray-700">Flood Insurance:</span><span className="font-semibold">${dscrResult.monthlyFlood.toFixed(2)}</span></div>}
                 {dscrResult.monthlyHOA > 0 && <div className="flex justify-between"><span className="text-gray-700">HOA Dues:</span><span className="font-semibold">${dscrResult.monthlyHOA.toFixed(2)}</span></div>}
                 <div className="flex justify-between border-t pt-2 font-bold text-gray-900"><span>Total Monthly PITIA:</span><span>${dscrResult.monthlyPITIA.toFixed(2)}</span></div>
               </div>
             )}
           </Card>
         )}
      </div>
    </WizardStep>
  );
}