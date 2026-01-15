import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';
import { calculateBlanketMetrics } from '../../functions/blanketDealAllocator.js';

/**
 * Blanket deal loan allocation across multiple properties
 * Shows per-property LTV/DSCR and aggregates
 */
export default function BlanketAllocationPanel({ 
  properties = [], 
  loanAmount, 
  interestRate, 
  loanTermMonths,
  onAllocationsChange 
}) {
  const [allocations, setAllocations] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // Initialize allocations on mount or when properties change
  useEffect(() => {
    if (!properties.length || !loanAmount) return;

    const evenSplit = properties.map(() => loanAmount / properties.length);
    setAllocations(evenSplit);
  }, [properties, loanAmount]);

  // Recalculate metrics when allocations change
  useEffect(() => {
    if (!allocations.length || !loanAmount || !interestRate || !loanTermMonths) return;

    const calculatedMetrics = calculateBlanketMetrics(
      properties,
      allocations,
      loanTermMonths,
      interestRate
    );
    setMetrics(calculatedMetrics);

    if (onAllocationsChange) {
      onAllocationsChange(allocations, calculatedMetrics);
    }
  }, [allocations, properties, loanAmount, interestRate, loanTermMonths]);

  const handleAllocationChange = (index, value) => {
    const newAllocations = [...allocations];
    newAllocations[index] = parseFloat(value) || 0;
    setAllocations(newAllocations);
  };

  const handleEvenSplit = () => {
    const evenSplit = properties.map(() => loanAmount / properties.length);
    setAllocations(evenSplit);
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a, 0);
  const difference = loanAmount - totalAllocated;
  const isBalanced = Math.abs(difference) < 1;

  return (
    <div className="space-y-4">
      {/* Aggregate Metrics */}
      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Aggregate DSCR</p>
              <p className={`text-lg font-semibold ${
                metrics.dscr >= 1.2 ? 'text-green-600' :
                metrics.dscr >= 1.0 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.dscr.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Aggregate LTV</p>
              <p className={`text-lg font-semibold ${
                metrics.ltv <= 70 ? 'text-green-600' :
                metrics.ltv <= 80 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.ltv.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Monthly PI</p>
              <p className="text-lg font-semibold text-gray-900">
                ${metrics.monthly_pi.toLocaleString('en-US', {maximumFractionDigits: 0})}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-gray-500">Monthly PITIA</p>
              <p className="text-lg font-semibold text-gray-900">
                ${metrics.monthly_pitia.toLocaleString('en-US', {maximumFractionDigits: 0})}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Allocation by Property */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Loan Allocation</CardTitle>
          <Button size="sm" variant="outline" onClick={handleEvenSplit}>
            Even Split
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isBalanced && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <p className="text-sm text-yellow-800">
                Allocation difference: {difference > 0 ? '+' : ''} ${difference.toLocaleString('en-US', {maximumFractionDigits: 2})}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {properties.map((property, idx) => {
              const allocated = allocations[idx] || 0;
              const breakdown = metrics?.property_breakdowns[idx];

              return (
                <div key={property.id} className="space-y-2 pb-3 border-b last:border-b-0">
                  <div className="flex items-start gap-2">
                    <Home className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {property.address_street}, {property.address_city}
                      </p>
                      <p className="text-xs text-gray-500">
                        {property.address_city}, {property.address_state}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 ml-6">
                    <div className="space-y-1">
                      <Label className="text-xs">Allocated Amount</Label>
                      <Input
                        type="number"
                        value={allocated || ''}
                        onChange={(e) => handleAllocationChange(idx, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">% of Total</Label>
                      <div className="h-9 flex items-center px-3 bg-gray-50 rounded-md text-sm font-medium text-gray-700">
                        {loanAmount > 0 ? ((allocated / loanAmount) * 100).toFixed(1) : '0'}%
                      </div>
                    </div>
                  </div>

                  {breakdown && (
                    <div className="grid grid-cols-2 gap-3 ml-6 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-gray-600">Property LTV</p>
                        <p className={`font-semibold ${
                          breakdown.ltv_ratio <= 70 ? 'text-green-600' :
                          breakdown.ltv_ratio <= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {breakdown.ltv_ratio.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-gray-600">Property DSCR</p>
                        <p className={`font-semibold ${
                          breakdown.dscr_ratio >= 1.2 ? 'text-green-600' :
                          breakdown.dscr_ratio >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {breakdown.dscr_ratio.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}