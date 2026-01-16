import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileOutput, Download, Send, Loader2, ChevronRight } from 'lucide-react';
import PremiumQuoteSheet from './quote/PremiumQuoteSheet';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

export default function QuoteGeneratorModal({ isOpen, onClose, lead }) {
  const [tab, setTab] = useState('generate');
  const [quoteData, setQuoteData] = useState({
    borrowerName: lead?.name || '',
    borrowerEmail: lead?.email || '',
    propertyAddress: lead?.property_address || '',
    propertyValue: '',
    loanAmount: '',
    loanProduct: 'DSCR',
    loanPurpose: 'Purchase',
    interestRate: '',
    pointsCost: '0',
    term: '30',
    originationFee: '1.5',
    appraisalFee: '500',
    titleInsurance: '1200',
    titleSearch: '300',
    homeInspection: '500',
    survey: '400',
    otherFees: '0',
  });
  const [generatedQuote, setGeneratedQuote] = useState(null);

  const handleGenerate = () => {
    const loanAmount = parseFloat(quoteData.loanAmount) || 0;
    const rate = parseFloat(quoteData.interestRate) / 100 || 0;
    const termMonths = parseInt(quoteData.term) * 12;
    const propertyValue = parseFloat(quoteData.propertyValue) || loanAmount;
    const points = parseFloat(quoteData.pointsCost) || 0;
    const origFee = (parseFloat(quoteData.originationFee) || 0) / 100;
    
    const appraisalFee = parseFloat(quoteData.appraisalFee) || 0;
    const titleInsurance = parseFloat(quoteData.titleInsurance) || 0;
    const titleSearch = parseFloat(quoteData.titleSearch) || 0;
    const homeInspection = parseFloat(quoteData.homeInspection) || 0;
    const survey = parseFloat(quoteData.survey) || 0;
    const otherFees = parseFloat(quoteData.otherFees) || 0;
    const closingCosts = appraisalFee + titleInsurance + titleSearch + homeInspection + survey + otherFees;

    const ltv = propertyValue > 0 ? ((loanAmount / propertyValue) * 100).toFixed(2) : 0;
    const monthlyRent = 0;
    const monthlyRate = rate / 12;
    let principalInterest = 0;
    if (monthlyRate > 0 && loanAmount > 0) {
      principalInterest = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    const originationFeeAmount = loanAmount * origFee;
    const totalUpfrontCosts = points + originationFeeAmount + closingCosts;
    const totalPayment = principalInterest * termMonths;
    const totalCostOfLoan = totalPayment + totalUpfrontCosts;
    const totalClosingCosts = closingCosts;

    setGeneratedQuote({
      borrowerName: quoteData.borrowerName,
      borrowerEmail: quoteData.borrowerEmail,
      propertyAddress: quoteData.propertyAddress,
      propertyValue: propertyValue,
      loanAmount: loanAmount,
      loanProduct: quoteData.loanProduct,
      loanPurpose: quoteData.loanPurpose,
      interestRate: quoteData.interestRate,
      term: quoteData.term,
      ltv: ltv.toFixed(2),
      dscr: '0.00',
      monthlyPayment: principalInterest.toFixed(2),
      principalInterest: principalInterest.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      points: points.toFixed(2),
      originationFee: originationFeeAmount.toFixed(2),
      appraisalFee: appraisalFee.toFixed(2),
      titleInsurance: titleInsurance.toFixed(2),
      titleSearch: titleSearch.toFixed(2),
      homeInspection: homeInspection.toFixed(2),
      survey: survey.toFixed(2),
      otherFees: otherFees.toFixed(2),
      totalClosingCosts: totalClosingCosts.toFixed(2),
      totalUpfrontCosts: totalUpfrontCosts.toFixed(2),
      totalCostOfLoan: totalCostOfLoan.toFixed(2),
      apr: (parseFloat(quoteData.interestRate) + ((totalUpfrontCosts / loanAmount) * 100 / parseInt(quoteData.term))).toFixed(3),
      generatedAt: new Date().toLocaleString(),
    });
    setTab('preview');
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      return await base44.functions.invoke('sendQuote', {
        borrower_email: generatedQuote.borrowerEmail,
        borrower_name: generatedQuote.borrowerName,
        quote_data: generatedQuote,
      });
    },
    onSuccess: () => {
      toast.success('Quote sent successfully!');
      onClose();
    },
    onError: (error) => {
      console.error('Send quote error:', error);
      toast.error('Failed to send quote: ' + error.message);
    },
  });

  const handleDownloadPDF = () => {
    if (!generatedQuote) return;
    
    const doc = new jsPDF();
    const q = generatedQuote;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text('Loan Quote', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${q.generatedAt}`, 20, 32);
    
    // Borrower Info
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Borrower Information', 20, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${q.borrowerName}`, 20, 52);
    doc.text(`Email: ${q.borrowerEmail}`, 20, 58);
    doc.text(`Property: ${q.propertyAddress}`, 20, 64);
    
    // Loan Details
    doc.setFontSize(14);
    doc.text('Loan Details', 20, 78);
    doc.setFontSize(10);
    doc.text(`Loan Amount: $${parseFloat(q.loanAmount).toLocaleString()}`, 20, 85);
    doc.text(`Property Value: $${parseFloat(q.propertyValue).toLocaleString()}`, 20, 91);
    doc.text(`Loan Type: ${q.loanProduct}`, 20, 97);
    doc.text(`Purpose: ${q.loanPurpose}`, 20, 103);
    doc.text(`Term: ${q.term} years`, 20, 109);
    doc.text(`Interest Rate: ${q.interestRate}%`, 20, 115);
    doc.text(`APR: ${q.apr}%`, 120, 115);
    doc.text(`LTV: ${q.ltv}%`, 20, 121);
    
    // Monthly Payment
    doc.setFontSize(14);
    doc.text('Monthly Payment', 20, 135);
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text(`$${parseFloat(q.monthlyPayment).toLocaleString()}`, 20, 143);
    
    // Costs
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Closing Costs', 20, 158);
    doc.setFontSize(10);
    let y = 165;
    const costs = [
      ['Origination Fee', q.originationFee],
      ['Points', q.points],
      ['Appraisal', q.appraisalFee],
      ['Title Insurance', q.titleInsurance],
      ['Title Search', q.titleSearch],
      ['Home Inspection', q.homeInspection],
      ['Survey', q.survey],
      ['Other Fees', q.otherFees],
    ];
    costs.forEach(([label, value]) => {
      doc.text(`${label}: $${parseFloat(value).toLocaleString()}`, 20, y);
      y += 6;
    });
    
    doc.setFontSize(11);
    doc.text(`Total Closing Costs: $${parseFloat(q.totalClosingCosts).toLocaleString()}`, 20, y + 4);
    doc.text(`Total Upfront Costs: $${parseFloat(q.totalUpfrontCosts).toLocaleString()}`, 20, y + 11);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text(`Total Cost of Loan: $${parseFloat(q.totalCostOfLoan).toLocaleString()}`, 20, y + 22);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text('Quote valid for 7 days. This is an estimate and not a commitment to lend.', 20, 280);
    doc.text('LoanGenius - Professional Lending Solutions', 20, 285);
    
    doc.save(`Quote-${q.borrowerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF downloaded successfully!');
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileOutput className="h-6 w-6 text-blue-600" />
              Professional Loan Quote Generator
            </DialogTitle>
            <p className="text-sm text-slate-600">Create premium, professional quotes that impress borrowers</p>
          </DialogHeader>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full px-6 pb-6">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="generate" className="text-base">
              Quote Details
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedQuote} className="text-base">
              Preview & Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6 mt-6">
            {/* Borrower Information */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide text-blue-600">Borrower Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Full Name</Label>
                  <Input
                    placeholder="John Smith"
                    value={quoteData.borrowerName}
                    onChange={(e) => setQuoteData({...quoteData, borrowerName: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={quoteData.borrowerEmail}
                    onChange={(e) => setQuoteData({...quoteData, borrowerEmail: e.target.value})}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide text-blue-600">Property Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Property Address</Label>
                  <Input
                    placeholder="123 Main Street, Springfield, IL 62701"
                    value={quoteData.propertyAddress}
                    onChange={(e) => setQuoteData({...quoteData, propertyAddress: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">Property Value</Label>
                    <Input
                      type="number"
                      placeholder="500000"
                      value={quoteData.propertyValue}
                      onChange={(e) => setQuoteData({...quoteData, propertyValue: e.target.value})}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-slate-700">Loan Amount</Label>
                    <Input
                      type="number"
                      placeholder="400000"
                      value={quoteData.loanAmount}
                      onChange={(e) => setQuoteData({...quoteData, loanAmount: e.target.value})}
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Terms */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide text-blue-600">Loan Terms</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Loan Type</Label>
                  <Select value={quoteData.loanProduct} onValueChange={(v) => setQuoteData({...quoteData, loanProduct: v})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DSCR">DSCR</SelectItem>
                      <SelectItem value="Conventional">Conventional</SelectItem>
                      <SelectItem value="FHA">FHA</SelectItem>
                      <SelectItem value="VA">VA</SelectItem>
                      <SelectItem value="Hard Money">Hard Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Loan Purpose</Label>
                  <Select value={quoteData.loanPurpose} onValueChange={(v) => setQuoteData({...quoteData, loanPurpose: v})}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Refinance">Refinance</SelectItem>
                      <SelectItem value="Cash-Out">Cash-Out</SelectItem>
                      <SelectItem value="Rate and Term">Rate and Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Term (Years)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={quoteData.term}
                    onChange={(e) => setQuoteData({...quoteData, term: e.target.value})}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Interest Rate & Fees */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide text-blue-600">Pricing & Fees</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.125"
                    placeholder="7.5"
                    value={quoteData.interestRate}
                    onChange={(e) => setQuoteData({...quoteData, interestRate: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Points</Label>
                  <Input
                    type="number"
                    step="0.125"
                    placeholder="0"
                    value={quoteData.pointsCost}
                    onChange={(e) => setQuoteData({...quoteData, pointsCost: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Origination Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="1.5"
                    value={quoteData.originationFee}
                    onChange={(e) => setQuoteData({...quoteData, originationFee: e.target.value})}
                    className="h-11"
                  />
                </div>
              </div>
            </div>

            {/* Closing Costs */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide text-blue-600">Closing Costs</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'appraisalFee', label: 'Appraisal Fee' },
                  { key: 'titleInsurance', label: 'Title Insurance' },
                  { key: 'titleSearch', label: 'Title Search' },
                  { key: 'homeInspection', label: 'Home Inspection' },
                  { key: 'survey', label: 'Survey' },
                  { key: 'otherFees', label: 'Other Fees' },
                ].map(fee => (
                  <div key={fee.key} className="space-y-2">
                    <Label className="font-semibold text-slate-700 text-sm">{fee.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quoteData[fee.key]}
                      onChange={(e) => setQuoteData({...quoteData, [fee.key]: e.target.value})}
                      className="h-11"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate} 
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold gap-2 shadow-lg"
            >
              <FileOutput className="h-5 w-5" />
              Generate Professional Quote
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6 mt-6">
            {generatedQuote && (
              <PremiumQuoteSheet 
                quote={generatedQuote}
                onEdit={() => setTab('generate')}
                onDownload={handleDownloadPDF}
                onSend={() => sendMutation.mutate()}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}