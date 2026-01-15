import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
            <Label>Current Lease Rent (monthly)</Label>
            <Input
              type="number"
              placeholder="2800"
              value={data.currentLeaseRent || ''}
              onChange={(e) => onChange({ currentLeaseRent: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Market Rent (monthly)</Label>
            <Input
              type="number"
              placeholder="2900"
              value={data.marketRent || ''}
              onChange={(e) => onChange({ marketRent: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Rent Used for DSCR</Label>
            <Input
              type="number"
              placeholder="Auto"
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
              placeholder="4200"
              value={data.propertyTaxesAnnual || ''}
              onChange={(e) => onChange({ propertyTaxesAnnual: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Annual Insurance *</Label>
            <Input
              type="number"
              placeholder="1800"
              value={data.insuranceAnnual || ''}
              onChange={(e) => onChange({ insuranceAnnual: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Annual Flood Insurance</Label>
            <Input
              type="number"
              placeholder="0"
              value={data.floodInsuranceAnnual || ''}
              onChange={(e) => onChange({ floodInsuranceAnnual: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Monthly HOA Dues</Label>
            <Input
              type="number"
              placeholder="0"
              value={data.hoaDuesMonthly || ''}
              onChange={(e) => onChange({ hoaDuesMonthly: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Live DSCR Display */}
        {dscrResult && (
          <Card className={`p-6 border-2 ${dscrColor.includes('green') ? 'border-green-200 bg-green-50' : dscrColor.includes('yellow') ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Estimated DSCR</p>
              <p className={`text-4xl font-bold ${dscrColor}`}>{dscrResult.dscrRatio.toFixed(2)}</p>
              <p className={`text-sm mt-1 ${dscrColor}`}>
                {dscrResult.qualifiesStandard ? '✓ Qualifies (1.25+)' : dscrResult.qualifies ? '⚠️ Qualifies (1.0+)' : '✗ Does not qualify'}
              </p>
            </div>

            <button
              onClick={() => setExpandPITIA(!expandPITIA)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {expandPITIA ? '▼' : '▶'} PITIA Breakdown
            </button>

            {expandPITIA && (
              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between"><span>Monthly P&I:</span><span className="font-semibold">${dscrResult.monthlyPI.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Monthly Taxes:</span><span className="font-semibold">${dscrResult.monthlyTaxes.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Monthly Insurance:</span><span className="font-semibold">${dscrResult.monthlyInsurance.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Monthly Flood:</span><span className="font-semibold">${dscrResult.monthlyFlood.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Monthly HOA:</span><span className="font-semibold">${dscrResult.monthlyHOA.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Total PITIA:</span><span>${dscrResult.monthlyPITIA.toFixed(2)}</span></div>
              </div>
            )}
          </Card>
        )}
      </div>
    </WizardStep>
  );
}