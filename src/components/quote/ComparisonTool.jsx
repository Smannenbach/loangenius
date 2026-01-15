import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from 'lucide-react';

export default function ComparisonTool({ baseQuote }) {
  const [compareRate, setCompareRate] = useState((parseFloat(baseQuote.interestRate) + 0.5).toString());

  const calculateComparison = () => {
    const baseRate = parseFloat(baseQuote.interestRate) / 100;
    const compareRateDecimal = parseFloat(compareRate) / 100;
    
    const loanAmount = parseFloat(baseQuote.loanAmount);
    const termMonths = parseInt(baseQuote.term) * 12;

    // Base calculation
    const baseMonthlyRate = baseRate / 12;
    const basePayment = loanAmount * 
      (baseMonthlyRate * Math.pow(1 + baseMonthlyRate, termMonths)) / 
      (Math.pow(1 + baseMonthlyRate, termMonths) - 1);

    // Compare calculation
    const compareMonthlyRate = compareRateDecimal / 12;
    const comparePayment = loanAmount * 
      (compareMonthlyRate * Math.pow(1 + compareMonthlyRate, termMonths)) / 
      (Math.pow(1 + compareMonthlyRate, termMonths) - 1);

    const monthlySavings = basePayment - comparePayment;
    const totalSavings = monthlySavings * termMonths;

    return {
      basePayment: basePayment.toFixed(2),
      comparePayment: comparePayment.toFixed(2),
      monthlySavings: monthlySavings.toFixed(2),
      totalSavings: totalSavings.toFixed(2),
    };
  };

  const comparison = calculateComparison();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Rate Comparison Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Compare with rate (%)</Label>
          <Input
            type="number"
            step="0.125"
            value={compareRate}
            onChange={(e) => setCompareRate(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 uppercase">Your Rate</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ${parseFloat(comparison.basePayment).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">monthly</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 uppercase">{compareRate}% Rate</p>
            <p className="text-2xl font-bold text-gray-600 mt-1">
              ${parseFloat(comparison.comparePayment).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600 mt-1">monthly</p>
          </div>
        </div>

        {parseFloat(comparison.monthlySavings) > 0 ? (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <p className="text-sm font-semibold text-green-900">💰 You save with your rate:</p>
            <p className="text-xl font-bold text-green-600 mt-2">
              ${parseFloat(comparison.monthlySavings).toLocaleString()}/mo
            </p>
            <p className="text-sm text-green-700 mt-1">
              ${parseFloat(comparison.totalSavings).toLocaleString()} over {baseQuote.term} years
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm font-semibold text-red-900">Higher rate would cost:</p>
            <p className="text-xl font-bold text-red-600 mt-2">
              ${Math.abs(parseFloat(comparison.monthlySavings)).toLocaleString()}/mo more
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}