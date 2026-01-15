import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileOutput, Download, Send, Building2, DollarSign, Percent } from 'lucide-react';

export default function QuoteGenerator() {
  const [quoteData, setQuoteData] = useState({
    borrowerName: '',
    propertyAddress: '',
    propertyValue: '',
    loanAmount: '',
    loanProduct: '',
    loanPurpose: 'Purchase',
    interestRate: '',
    term: '30',
  });

  const [generatedQuote, setGeneratedQuote] = useState(null);

  const handleGenerate = () => {
    const loanAmount = parseFloat(quoteData.loanAmount) || 0;
    const rate = parseFloat(quoteData.interestRate) / 100 || 0;
    const termMonths = parseInt(quoteData.term) * 12;

    const monthlyRate = rate / 12;
    let monthlyPayment = 0;
    if (monthlyRate > 0 && loanAmount > 0) {
      monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    const propertyValue = parseFloat(quoteData.propertyValue) || loanAmount;
    const ltv = loanAmount > 0 ? ((loanAmount / propertyValue) * 100) : 0;

    setGeneratedQuote({
      borrowerName: quoteData.borrowerName,
      propertyAddress: quoteData.propertyAddress,
      propertyValue: propertyValue,
      loanAmount: loanAmount,
      loanProduct: quoteData.loanProduct,
      loanPurpose: quoteData.loanPurpose,
      interestRate: quoteData.interestRate,
      term: quoteData.term,
      ltv: ltv.toFixed(2),
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPayment: (monthlyPayment * termMonths).toFixed(2),
      generatedAt: new Date().toLocaleString(),
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <FileOutput className="h-7 w-7 text-blue-600" />
          Quote Generator
        </h1>
        <p className="text-gray-500 mt-1">Create professional loan quotes for your borrowers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Quote Details</CardTitle>
            <CardDescription>Enter information to generate a quote</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Borrower Name</Label>
              <Input
                placeholder="John Smith"
                value={quoteData.borrowerName}
                onChange={(e) => setQuoteData({...quoteData, borrowerName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Property Address</Label>
              <Input
                placeholder="123 Main St, City, State"
                value={quoteData.propertyAddress}
                onChange={(e) => setQuoteData({...quoteData, propertyAddress: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Loan Amount ($)</Label>
              <Input
                type="number"
                placeholder="500,000"
                value={quoteData.loanAmount}
                onChange={(e) => setQuoteData({...quoteData, loanAmount: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Property Value ($)</Label>
              <Input
                type="number"
                placeholder="625,000"
                value={quoteData.propertyValue}
                onChange={(e) => setQuoteData({...quoteData, propertyValue: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Loan Product</Label>
              <Select
                value={quoteData.loanProduct}
                onValueChange={(v) => setQuoteData({...quoteData, loanProduct: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DSCR">DSCR</SelectItem>
                  <SelectItem value="DSCR - No Ratio">DSCR - No Ratio</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="DSCR Blanket">DSCR Blanket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loan Purpose</Label>
              <Select
                value={quoteData.loanPurpose}
                onValueChange={(v) => setQuoteData({...quoteData, loanPurpose: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Refinance">Refinance</SelectItem>
                  <SelectItem value="Cash-Out Refinance">Cash-Out Refinance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  step="0.125"
                  placeholder="7.5"
                  value={quoteData.interestRate}
                  onChange={(e) => setQuoteData({...quoteData, interestRate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Term (Years)</Label>
                <Select
                  value={quoteData.term}
                  onValueChange={(v) => setQuoteData({...quoteData, term: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Years</SelectItem>
                    <SelectItem value="15">15 Years</SelectItem>
                    <SelectItem value="10">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleGenerate} 
              className="w-full bg-blue-600 hover:bg-blue-500"
              disabled={!quoteData.borrowerName || !quoteData.loanAmount}
            >
              <FileOutput className="h-4 w-4 mr-2" />
              Generate Quote
            </Button>
          </CardContent>
        </Card>

        {/* Generated Quote Preview */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Quote Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {generatedQuote ? (
              <div className="space-y-6">
                {/* Quote Header */}
                <div className="text-center pb-4 border-b">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <span className="font-bold text-xl text-gray-900">LoanGenius</span>
                  </div>
                  <p className="text-sm text-gray-500">Loan Quote</p>
                </div>

                {/* Quote Details */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Borrower</span>
                    <span className="font-medium">{generatedQuote.borrowerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Property</span>
                    <span className="font-medium text-right max-w-48 truncate">{generatedQuote.propertyAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loan Product</span>
                    <span className="font-medium capitalize">{generatedQuote.loanProduct}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Loan Purpose</span>
                    <span className="font-medium capitalize">{generatedQuote.loanPurpose}</span>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Property Value</span>
                    <span className="font-bold text-gray-900">${parseFloat(generatedQuote.propertyValue).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Amount</span>
                    <span className="font-bold text-gray-900">${generatedQuote.loanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">LTV</span>
                    <span className="font-bold text-gray-900">{generatedQuote.ltv}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Rate</span>
                    <span className="font-bold text-gray-900">{generatedQuote.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Term</span>
                    <span className="font-bold text-gray-900">{generatedQuote.term} years</span>
                  </div>
                  <div className="pt-3 border-t border-blue-200">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Monthly Payment</span>
                      <span className="font-bold text-xl text-blue-600">
                        ${parseFloat(generatedQuote.monthlyPayment).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button className="flex-1 gap-2 bg-blue-600 hover:bg-blue-500">
                    <Send className="h-4 w-4" />
                    Send to Borrower
                  </Button>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  Generated: {generatedQuote.generatedAt}
                </p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileOutput className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Fill in the details and generate a quote</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}