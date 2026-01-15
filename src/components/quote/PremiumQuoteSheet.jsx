import React from 'react';
import { Download, Mail, TrendingUp, DollarSign, Percent, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PremiumQuoteSheet({ quote, onDownload, onSend, onEdit }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    return parseFloat(value).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Premium Quote Sheet */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 shadow-2xl text-white">
        {/* Header */}
        <div className="border-b border-blue-400/30 pb-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-sm font-semibold text-blue-300 tracking-widest uppercase mb-1">Personalized Loan Quote</div>
              <h2 className="text-4xl font-black bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">
                {formatCurrency(parseFloat(quote.loanAmount))}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-blue-300 text-sm font-medium">{quote.loanProduct}</p>
              <p className="text-2xl font-bold text-cyan-300 mt-1">{formatPercent(quote.interestRate)}%</p>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-xl font-bold text-blue-50">{quote.borrowerName}</p>
            <p className="text-sm text-blue-200">{quote.propertyAddress}</p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-blue-400/20">
            <div className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-2">Monthly Payment</div>
            <div className="text-3xl font-black">{formatCurrency(parseFloat(quote.monthlyPayment))}</div>
            <p className="text-xs text-blue-200 mt-2">Principal & Interest</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-blue-400/20">
            <div className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-2">LTV Ratio</div>
            <div className="text-3xl font-black">{formatPercent(quote.ltv)}%</div>
            <p className="text-xs text-blue-200 mt-2">Loan to Value</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-blue-400/20">
            <div className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-2">APR</div>
            <div className="text-3xl font-black">{formatPercent(quote.apr)}%</div>
            <p className="text-xs text-blue-200 mt-2">Annual Rate</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-blue-400/20">
            <div className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-2">Term</div>
            <div className="text-3xl font-black">{quote.term}</div>
            <p className="text-xs text-blue-200 mt-2">Years</p>
          </div>
        </div>

        {/* Loan Details */}
        <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-blue-400/30">
          <div>
            <p className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-3">Loan Details</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Property Value</span>
                <span className="font-bold text-white">{formatCurrency(parseFloat(quote.propertyValue))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Loan Amount</span>
                <span className="font-bold text-white">{formatCurrency(parseFloat(quote.loanAmount))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Interest Rate</span>
                <span className="font-bold text-white">{formatPercent(quote.interestRate)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Loan Purpose</span>
                <span className="font-bold text-white">{quote.loanPurpose}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-3">Cost Summary</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Origination Fee</span>
                <span className="font-bold text-cyan-300">{formatCurrency(parseFloat(quote.originationFee))}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">Points</span>
                <span className="font-bold text-cyan-300">{formatCurrency(parseFloat(quote.points))}</span>
              </div>
              <div className="flex justify-between items-center border-t border-blue-400/20 pt-2.5">
                <span className="text-blue-100 font-semibold">Total Upfront</span>
                <span className="font-bold text-cyan-300 text-lg">{formatCurrency(parseFloat(quote.totalUpfrontCosts))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Closing Costs Breakdown */}
        <div className="mb-8">
          <p className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-4">Closing Costs Breakdown</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Appraisal', value: quote.appraisalFee },
              { label: 'Title Insurance', value: quote.titleInsurance },
              { label: 'Title Search', value: quote.titleSearch },
              { label: 'Inspection', value: quote.homeInspection },
              { label: 'Survey', value: quote.survey },
              { label: 'Other Fees', value: quote.otherFees },
            ].map((fee, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-blue-200">{fee.label}</span>
                <span className="font-semibold text-blue-100">{formatCurrency(parseFloat(fee.value || 0))}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-blue-400/10 rounded-lg border border-blue-400/20 flex justify-between">
            <span className="font-semibold text-blue-100">Total Closing Costs</span>
            <span className="font-bold text-cyan-300">{formatCurrency(parseFloat(quote.totalClosingCosts))}</span>
          </div>
        </div>

        {/* Total Cost Box */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl p-6 border border-cyan-400/30">
          <p className="text-blue-300 text-xs font-semibold tracking-wider uppercase mb-2">Total Cost of Loan</p>
          <div className="text-4xl font-black text-cyan-300">
            {formatCurrency(parseFloat(quote.totalCostOfLoan))}
          </div>
          <p className="text-sm text-blue-200 mt-3">
            Over {quote.term} years at {formatPercent(quote.interestRate)}% ({formatPercent(quote.apr)}% APR)
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-blue-400/30 flex justify-between items-center text-sm text-blue-300">
          <p>Quote valid for 7 days • {quote.generatedAt}</p>
          <p>LoanGenius - Professional Lending Solutions</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          className="flex-1 gap-2 h-11"
          onClick={onEdit}
        >
          Edit Details
        </Button>
        <Button 
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2 h-11"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2 h-11"
          onClick={onSend}
        >
          <Mail className="h-4 w-4" />
          Send to Borrower
        </Button>
      </div>
    </div>
  );
}