import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { calculateSinglePropertyDSCR, calculateLTV } from './dscr-utils';
import WizardStep from './WizardStep';

export default function Step6Review({ data, onChange, onNext, onPrev, loading = false }) {
  const dscrResult = useMemo(() => {
    if (!data.loanAmount || !data.interestRate || !data.monthlyRent || !data.propertyTaxesAnnual || !data.insuranceAnnual) {
      return null;
    }
    return calculateSinglePropertyDSCR({
      loanAmount: data.loanAmount,
      interestRate: data.interestRate,
      loanTermMonths: data.loanTermMonths || 360,
      amortizationMonths: data.loanTermMonths || 360,
      monthlyRent: data.monthlyRent,
      propertyTaxesAnnual: data.propertyTaxesAnnual,
      insuranceAnnual: data.insuranceAnnual,
      floodInsuranceAnnual: data.floodInsuranceAnnual || 0,
      hoaDuesMonthly: data.hoaDuesMonthly || 0,
    });
  }, [data]);

  const ltv = useMemo(() => {
    if (data.loanPurpose === 'Purchase') {
      return calculateLTV(data.loanAmount || 0, data.purchasePrice || 1);
    }
    return calculateLTV(data.loanAmount || 0, data.appraisedValue || 1);
  }, [data]);

  return (
    <WizardStep
      stepNumber={6}
      title="Review & Create Deal"
      description="Confirm all details before creating"
      onNext={onNext}
      onPrev={onPrev}
      isValid={true}
      isLastStep={true}
      loading={loading}
    >
      <div className="space-y-6">
        {/* Loan Summary */}
        <Card className="p-6 border-blue-200 bg-blue-50">
          <h3 className="font-bold text-lg mb-4">Loan Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-600">Loan Type</p><p className="font-semibold">{data.loanType}</p></div>
            <div><p className="text-gray-600">Purpose</p><p className="font-semibold">{data.loanPurpose?.replace(/_/g, ' ')}</p></div>
            <div><p className="text-gray-600">Loan Amount</p><p className="font-semibold">${(data.loanAmount || 0).toLocaleString()}</p></div>
            <div><p className="text-gray-600">Interest Rate</p><p className="font-semibold">{data.interestRate}%</p></div>
            <div><p className="text-gray-600">Term</p><p className="font-semibold">{data.loanTermMonths} months</p></div>
            <div><p className="text-gray-600">LTV</p><p className="font-semibold">{ltv.toFixed(2)}%</p></div>
            {data.purchasePrice && <div><p className="text-gray-600">Purchase Price</p><p className="font-semibold">${(data.purchasePrice || 0).toLocaleString()}</p></div>}
            {data.appraisedValue && <div><p className="text-gray-600">Appraised Value</p><p className="font-semibold">${(data.appraisedValue || 0).toLocaleString()}</p></div>}
          </div>
        </Card>

        {/* DSCR Result */}
        {dscrResult && (
          <Card className="p-6 border-green-200 bg-green-50">
            <h3 className="font-bold text-lg mb-4">DSCR Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Estimated DSCR</p>
                <p className={`text-2xl font-bold ${dscrResult.dscrRatio >= 1.25 ? 'text-green-600' : dscrResult.dscrRatio >= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {dscrResult.dscrRatio.toFixed(2)}
                </p>
              </div>
              <div><p className="text-gray-600">Monthly Rent</p><p className="font-semibold">${dscrResult.monthlyRent.toFixed(2)}</p></div>
              <div><p className="text-gray-600">Monthly PITIA</p><p className="font-semibold">${dscrResult.monthlyPITIA.toFixed(2)}</p></div>
            </div>
          </Card>
        )}

        {/* Properties */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Properties ({data.properties?.length || 1})</h3>
          <div className="space-y-3">
            {data.properties && data.properties.length > 0 ? (
              data.properties.map((prop, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="font-medium">{prop.street}</p>
                  <p className="text-sm text-gray-600">{prop.city}, {prop.state} {prop.zip}</p>
                </div>
              ))
            ) : (
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="font-medium">{data.properties?.[0]?.street || 'Property details'}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Borrowers */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Borrowers ({data.borrowers?.length || 0})</h3>
          <div className="space-y-3">
            {data.borrowers && data.borrowers.length > 0 ? (
              data.borrowers.map((borrower, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="font-medium">{borrower.firstName} {borrower.lastName}</p>
                  <p className="text-sm text-gray-600">{borrower.email}</p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">{borrower.partyType.replace(/_/g, ' ')}</Badge>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No borrowers added</p>
            )}
          </div>
        </Card>

        {/* Validation Summary */}
        {(!data.borrowers || data.borrowers.length === 0) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Missing Borrowers</p>
              <p className="text-sm text-red-800 mt-1">Please add at least one borrower before creating the deal.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t flex gap-3">
          <Button variant="outline" className="flex-1">
            Save as Draft
          </Button>
          <Button onClick={onNext} className="flex-1 bg-green-600 hover:bg-green-500" disabled={loading || !data.borrowers?.length}>
            {loading ? 'Creating...' : '✓ Create Deal'}
          </Button>
        </div>
      </div>
    </WizardStep>
  );
}