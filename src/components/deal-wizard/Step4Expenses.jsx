import React, { useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Step4Expenses({ data, onChange, onNext, onPrev }) {
  const rentUsedForDSCR = useMemo(() => {
    const currentRent = parseFloat(data.currentLeaseRent) || 0;
    const marketRent = parseFloat(data.marketRent) || 0;
    if (currentRent === 0 && marketRent === 0) return 'Auto-calculated';
    return `Lesser of lease/market: $${Math.min(currentRent || Infinity, marketRent || Infinity).toLocaleString()}`;
  }, [data.currentLeaseRent, data.marketRent]);

  const canProceed = data.annualPropertyTaxes && data.annualHomeInsurance;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold flex-shrink-0">
          4
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rental Income & Expenses</h2>
          <p className="text-gray-600 mt-1">Enter property income and monthly obligations</p>
        </div>
      </div>

      {/* Content */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Current Lease Rent ($ per month) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={data.currentLeaseRent}
                onChange={(e) => onChange({ currentLeaseRent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Market Rent ($ per month)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={data.marketRent}
                onChange={(e) => onChange({ marketRent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Rent Used for DSCR</Label>
              <div className="h-10 px-3 rounded-md border border-gray-300 bg-gray-50 flex items-center">
                <span className="text-sm text-gray-600">{rentUsedForDSCR}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Annual Property Taxes *</Label>
              <Input
                type="number"
                placeholder="Enter annual amount"
                value={data.annualPropertyTaxes}
                onChange={(e) => onChange({ annualPropertyTaxes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Annual Home Insurance *</Label>
              <Input
                type="number"
                placeholder="Enter annual amount"
                value={data.annualHomeInsurance}
                onChange={(e) => onChange({ annualHomeInsurance: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-700">Annual Flood Insurance</Label>
              <Input
                type="number"
                placeholder="Enter annual amount or 0"
                value={data.annualFloodInsurance}
                onChange={(e) => onChange({ annualFloodInsurance: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Monthly HOA Dues</Label>
              <Input
                type="number"
                placeholder="Enter monthly amount or 0"
                value={data.monthlyHOA}
                onChange={(e) => onChange({ monthlyHOA: e.target.value })}
              />
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