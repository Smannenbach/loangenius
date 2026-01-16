import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Calculator, TrendingUp } from 'lucide-react';

/**
 * Real-time DSCR/LTV/PITIA calculator display
 * Shows calculation breakdown and warnings
 */
export default function DealCalculator({ deal, properties = [] }) {
  const [calculations, setCalculations] = useState({
    dscr: 0,
    ltv: 0,
    monthly_pi: 0,
    monthly_pitia: 0,
    breakdown: {}
  });

  // Manual input state for when no deal/properties
  const [manualInput, setManualInput] = useState({
    loanAmount: deal?.loan_amount || 500000,
    interestRate: deal?.interest_rate || 7.5,
    termMonths: deal?.loan_term_months || 360,
    propertyValue: properties[0]?.appraised_value || properties[0]?.purchase_price || 625000,
    grossRent: properties[0]?.gross_rent_monthly || 4500,
    taxes: properties[0]?.taxes_monthly || 350,
    insurance: properties[0]?.insurance_monthly || 150,
    hoa: properties[0]?.hoa_monthly || 0,
  });

  // Calculate monthly P&I using standard formula
  const calculatePI = (loanAmount, rate, termMonths) => {
    if (!loanAmount || !rate || !termMonths) return 0;
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate === 0) return loanAmount / termMonths;
    return loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  };

  useEffect(() => {
    const calculateMetrics = () => {
      const loanAmount = deal?.loan_amount || manualInput.loanAmount;
      const rate = deal?.interest_rate || manualInput.interestRate;
      const termMonths = deal?.loan_term_months || manualInput.termMonths;

      if (!loanAmount || !rate) {
        return { dscr: 0, ltv: 0, monthly_pi: 0, monthly_pitia: 0 };
      }

      const pi = calculatePI(loanAmount, rate, termMonths);

      let totalGrossRent, totalExpenses, totalValue;

      if (properties && properties.length > 0) {
        totalGrossRent = properties.reduce((sum, p) => 
          sum + (p.gross_rent_monthly || 0) + (p.other_income_monthly || 0), 0);
        
        totalExpenses = properties.reduce((sum, p) =>
          sum + (p.taxes_monthly || 0) + (p.insurance_monthly || 0) + 
                (p.hoa_monthly || 0) + (p.flood_insurance_monthly || 0), 0);
        
        totalValue = properties.reduce((sum, p) => 
          sum + (p.appraised_value || p.purchase_price || 0), 0);
      } else {
        totalGrossRent = manualInput.grossRent;
        totalExpenses = manualInput.taxes + manualInput.insurance + manualInput.hoa;
        totalValue = manualInput.propertyValue;
      }

      const monthly_pitia = pi + totalExpenses;
      const dscr = monthly_pitia > 0 ? totalGrossRent / monthly_pitia : 0;
      const ltv = totalValue > 0 ? (loanAmount / totalValue) * 100 : 0;

      return {
        dscr: parseFloat(dscr.toFixed(2)),
        ltv: parseFloat(ltv.toFixed(2)),
        monthly_pi: parseFloat(pi.toFixed(2)),
        monthly_pitia: parseFloat(monthly_pitia.toFixed(2)),
        breakdown: { pi, taxes: manualInput.taxes, insurance: manualInput.insurance }
      };
    };

    setCalculations(calculateMetrics());
  }, [deal, properties, manualInput]);

  const getMetricStatus = (metric, value) => {
    if (metric === 'dscr') {
      if (value >= 1.2) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
      if (value >= 1.0) return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      return { status: 'risk', color: 'text-red-600', bg: 'bg-red-50' };
    }
    if (metric === 'ltv') {
      if (value <= 70) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
      if (value <= 80) return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      return { status: 'risk', color: 'text-red-600', bg: 'bg-red-50' };
    }
    return { status: 'neutral', color: '', bg: '' };
  };

  const dscrStatus = getMetricStatus('dscr', calculations.dscr);
  const ltvStatus = getMetricStatus('ltv', calculations.ltv);

  const showManualInputs = !deal?.loan_amount || !properties?.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          DSCR Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manual Input Section */}
        {showManualInputs && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-xs">Loan Amount</Label>
              <Input
                type="number"
                value={manualInput.loanAmount}
                onChange={(e) => setManualInput({ ...manualInput, loanAmount: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Interest Rate (%)</Label>
              <Input
                type="number"
                step="0.125"
                value={manualInput.interestRate}
                onChange={(e) => setManualInput({ ...manualInput, interestRate: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Property Value</Label>
              <Input
                type="number"
                value={manualInput.propertyValue}
                onChange={(e) => setManualInput({ ...manualInput, propertyValue: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Monthly Rent</Label>
              <Input
                type="number"
                value={manualInput.grossRent}
                onChange={(e) => setManualInput({ ...manualInput, grossRent: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Monthly Taxes</Label>
              <Input
                type="number"
                value={manualInput.taxes}
                onChange={(e) => setManualInput({ ...manualInput, taxes: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Monthly Insurance</Label>
              <Input
                type="number"
                value={manualInput.insurance}
                onChange={(e) => setManualInput({ ...manualInput, insurance: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Monthly HOA</Label>
              <Input
                type="number"
                value={manualInput.hoa}
                onChange={(e) => setManualInput({ ...manualInput, hoa: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Term (Months)</Label>
              <Input
                type="number"
                value={manualInput.termMonths}
                onChange={(e) => setManualInput({ ...manualInput, termMonths: parseInt(e.target.value) || 360 })}
                className="h-9"
              />
            </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* DSCR */}
          <div className={`p-4 rounded-lg ${dscrStatus.bg || 'bg-gray-50'}`}>
            <p className="text-xs font-medium text-gray-600 uppercase">DSCR</p>
            <p className={`text-2xl font-bold mt-1 ${dscrStatus.color || 'text-gray-900'}`}>
              {calculations.dscr.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {dscrStatus.status === 'good' && '✓ Strong'}
              {dscrStatus.status === 'fair' && '~ Acceptable'}
              {dscrStatus.status === 'risk' && '⚠ Below min'}
            </p>
          </div>

          {/* LTV */}
          <div className={`p-4 rounded-lg ${ltvStatus.bg || 'bg-gray-50'}`}>
            <p className="text-xs font-medium text-gray-600 uppercase">LTV</p>
            <p className={`text-2xl font-bold mt-1 ${ltvStatus.color || 'text-gray-900'}`}>
              {calculations.ltv.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {ltvStatus.status === 'good' && '✓ Conservative'}
              {ltvStatus.status === 'fair' && '~ Acceptable'}
              {ltvStatus.status === 'risk' && '⚠ Elevated'}
            </p>
          </div>

          {/* Monthly P&I */}
          <div className="p-4 rounded-lg bg-blue-50">
            <p className="text-xs font-medium text-gray-600 uppercase">Monthly P&I</p>
            <p className="text-2xl font-bold mt-1 text-blue-700">
              ${calculations.monthly_pi.toLocaleString('en-US', {maximumFractionDigits: 0})}
            </p>
            <p className="text-xs text-gray-500 mt-1">Principal & Interest</p>
          </div>

          {/* Monthly PITIA */}
          <div className="p-4 rounded-lg bg-purple-50">
            <p className="text-xs font-medium text-gray-600 uppercase">Monthly PITIA</p>
            <p className="text-2xl font-bold mt-1 text-purple-700">
              ${calculations.monthly_pitia.toLocaleString('en-US', {maximumFractionDigits: 0})}
            </p>
            <p className="text-xs text-gray-500 mt-1">Full debt service</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}