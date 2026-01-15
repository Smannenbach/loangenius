import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp } from 'lucide-react';

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

  useEffect(() => {
    if (!deal || !properties.length) return;

    // Client-side calculation for preview
    const calculateMetrics = () => {
      if (!deal.loan_amount || !deal.interest_rate || !deal.loan_term_months) {
        return { dscr: 0, ltv: 0, monthly_pi: 0, monthly_pitia: 0 };
      }

      // P&I calculation
      const rate = deal.interest_rate / 100 / 12;
      const n = deal.loan_term_months;
      const pi = (deal.loan_amount * rate) / (1 - Math.pow(1 + rate, -n));

      // For blanket: aggregate; for single: use first property
      const totalGrossRent = properties.reduce((sum, p) => 
        sum + (p.gross_rent_monthly || 0) + (p.other_income_monthly || 0), 0);
      
      const totalExpenses = properties.reduce((sum, p) =>
        sum + (p.taxes_monthly || 0) + (p.insurance_monthly || 0) + 
              (p.hoa_monthly || 0) + (p.flood_insurance_monthly || 0), 0);

      const monthly_pitia = pi + totalExpenses;
      const dscr = monthly_pitia > 0 ? totalGrossRent / monthly_pitia : 0;
      
      const totalValue = properties.reduce((sum, p) => 
        sum + (p.appraised_value || p.purchase_price || 0), 0);
      const ltv = totalValue > 0 ? (deal.loan_amount / totalValue) * 100 : 0;

      return {
        dscr: parseFloat(dscr.toFixed(2)),
        ltv: parseFloat(ltv.toFixed(2)),
        monthly_pi: parseFloat(pi.toFixed(2)),
        monthly_pitia: parseFloat(monthly_pitia.toFixed(2)),
        breakdown: { pi, taxes: properties[0]?.taxes_monthly || 0, insurance: properties[0]?.insurance_monthly || 0 }
      };
    };

    setCalculations(calculateMetrics());
  }, [deal, properties]);

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

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* DSCR */}
      <Card className={dscrStatus.bg}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">DSCR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${dscrStatus.color}`}>
            {calculations.dscr.toFixed(2)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {dscrStatus.status === 'good' && '✓ Strong ratio'}
            {dscrStatus.status === 'fair' && '~ Acceptable'}
            {dscrStatus.status === 'risk' && '⚠ Below minimum'}
          </p>
        </CardContent>
      </Card>

      {/* LTV */}
      <Card className={ltvStatus.bg}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">LTV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${ltvStatus.color}`}>
            {calculations.ltv.toFixed(1)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {ltvStatus.status === 'good' && '✓ Conservative'}
            {ltvStatus.status === 'fair' && '~ Acceptable'}
            {ltvStatus.status === 'risk' && '⚠ Elevated'}
          </p>
        </CardContent>
      </Card>

      {/* Monthly P&I */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Monthly P&I</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            ${calculations.monthly_pi.toLocaleString('en-US', {maximumFractionDigits: 0})}
          </div>
          <p className="text-xs text-gray-500 mt-1">Principal & Interest</p>
        </CardContent>
      </Card>

      {/* Monthly PITIA */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Monthly PITIA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            ${calculations.monthly_pitia.toLocaleString('en-US', {maximumFractionDigits: 0})}
          </div>
          <p className="text-xs text-gray-500 mt-1">Full debt service</p>
        </CardContent>
      </Card>
    </div>
  );
}