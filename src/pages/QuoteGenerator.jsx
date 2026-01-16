import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileOutput, Download, Send, Building2, DollarSign, Percent, TrendingUp, AlertCircle, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";
import AmortizationSchedule from "@/components/quote/AmortizationSchedule";
import ComparisonTool from "@/components/quote/ComparisonTool";
import { jsPDF } from 'jspdf';

function SendQuoteButton({ quote }) {
  const [isOpen, setIsOpen] = useState(false);
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('sendQuote', {
        borrower_email: quote.borrowerEmail,
        borrower_name: quote.borrowerName,
        quote_data: quote,
      });
    },
    onSuccess: () => {
      setIsOpen(false);
      toast.success('Quote sent successfully!');
    },
    onError: (error) => {
      console.error('Send quote error:', error);
      toast.error('Failed to send quote: ' + error.message);
    },
  });

  return (
    <>
      <Button 
        className="flex-1 gap-2 bg-blue-600 hover:bg-blue-500"
        onClick={() => setIsOpen(true)}
        disabled={!quote.borrowerEmail}
      >
        <Send className="h-4 w-4" />
        Send to Borrower
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Quote to {quote.borrowerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Sending quote to: <span className="font-semibold">{quote.borrowerEmail}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Quote
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function QuoteGenerator() {
  const [quoteData, setQuoteData] = useState({
    borrowerName: '',
    borrowerEmail: '',
    propertyAddress: '',
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
  const [tab, setTab] = useState('generate');

  const handleGenerate = () => {
    const loanAmount = parseFloat(quoteData.loanAmount) || 0;
    const rate = parseFloat(quoteData.interestRate) / 100 || 0;
    const termMonths = parseInt(quoteData.term) * 12;
    const propertyValue = parseFloat(quoteData.propertyValue) || loanAmount;
    const points = parseFloat(quoteData.pointsCost) || 0;
    const origFee = (parseFloat(quoteData.originationFee) || 0) / 100;
    
    // All closing costs
    const appraisalFee = parseFloat(quoteData.appraisalFee) || 0;
    const titleInsurance = parseFloat(quoteData.titleInsurance) || 0;
    const titleSearch = parseFloat(quoteData.titleSearch) || 0;
    const homeInspection = parseFloat(quoteData.homeInspection) || 0;
    const survey = parseFloat(quoteData.survey) || 0;
    const otherFees = parseFloat(quoteData.otherFees) || 0;
    const closingCosts = appraisalFee + titleInsurance + titleSearch + homeInspection + survey + otherFees;

    const monthlyRate = rate / 12;
    let monthlyPayment = 0;
    let principalInterest = 0;

    if (monthlyRate > 0 && loanAmount > 0) {
      principalInterest = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
      monthlyPayment = principalInterest;
    }

    const ltv = loanAmount > 0 ? ((loanAmount / propertyValue) * 100) : 0;
    const originationFeeAmount = loanAmount * origFee;
    const totalUpfrontCosts = points + originationFeeAmount + closingCosts;
    const totalPayment = principalInterest * termMonths;
    const totalCostOfLoan = totalPayment + totalUpfrontCosts;
    const totalClosingCosts = closingCosts;

    // DSCR Calculation (simplified)
    const grossMonthlyIncome = loanAmount > 0 ? (loanAmount / 25) : 0; // Rough estimate
    const dscr = grossMonthlyIncome > 0 ? (grossMonthlyIncome / monthlyPayment) : 0;

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
      dscr: dscr.toFixed(2),
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
      apr: (quoteData.interestRate + ((totalUpfrontCosts / loanAmount) * 100 / parseInt(quoteData.term))).toFixed(3),
      generatedAt: new Date().toLocaleString(),
    });

    setTab('preview');
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.text('LoanGenius Quote', margin, yPos);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Generated: ${generatedQuote.generatedAt}`, margin, yPos + 8);
      yPos += 20;

      // Borrower & Property
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('BORROWER INFORMATION', margin, yPos);
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      yPos += 6;
      doc.text(`Name: ${generatedQuote.borrowerName}`, margin + 5, yPos);
      yPos += 4;
      doc.text(`Email: ${generatedQuote.borrowerEmail}`, margin + 5, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('PROPERTY INFORMATION', margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(`Address: ${generatedQuote.propertyAddress}`, margin + 5, yPos);
      yPos += 4;
      doc.text(`Value: $${parseFloat(generatedQuote.propertyValue).toLocaleString()}`, margin + 5, yPos);
      yPos += 10;

      // Key Metrics Grid
      const metrics = [
        ['Loan Amount', `$${parseFloat(generatedQuote.loanAmount).toLocaleString()}`],
        ['Interest Rate', `${generatedQuote.interestRate}%`],
        ['Term', `${generatedQuote.term} years`],
        ['LTV', `${generatedQuote.ltv}%`],
        ['DSCR', generatedQuote.dscr],
        ['Monthly P&I', `$${parseFloat(generatedQuote.monthlyPayment).toLocaleString()}`],
      ];

      doc.setFontSize(10);
      doc.setTextColor(31, 41, 55);
      let col = 0;
      let row = 0;
      const boxWidth = contentWidth / 2;
      const boxHeight = 12;
      
      metrics.forEach((metric, idx) => {
        const xPos = margin + (idx % 2) * boxWidth;
        const yPos_ = yPos + (Math.floor(idx / 2) * boxHeight);
        
        doc.setFillColor(243, 244, 246);
        doc.rect(xPos, yPos_, boxWidth - 2, boxHeight, 'F');
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(metric[0], xPos + 3, yPos_ + 4);
        doc.setFontSize(10);
        doc.setTextColor(31, 41, 55);
        doc.text(metric[1], xPos + 3, yPos_ + 9);
      });
      yPos += 38;

      // Payment Summary
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('PAYMENT SUMMARY', margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      const summaryItems = [
        ['Monthly P&I', `$${parseFloat(generatedQuote.monthlyPayment).toLocaleString()}`],
        ['Total Payments (all years)', `$${parseFloat(generatedQuote.totalPayment).toLocaleString()}`],
        ['Total Interest', `$${(parseFloat(generatedQuote.totalPayment) - parseFloat(generatedQuote.loanAmount)).toLocaleString()}`],
      ];
      
      summaryItems.forEach(item => {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.setTextColor(75, 85, 99);
        doc.text(item[0], margin + 5, yPos);
        doc.setTextColor(31, 41, 55);
        doc.text(item[1], pageWidth - margin - doc.getTextWidth(item[1]), yPos);
        yPos += 5;
      });
      yPos += 5;

      // Fees Breakdown
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.text('CLOSING COSTS & FEES', margin, yPos);
      yPos += 6;
      doc.setFontSize(9);
      
      const feeItems = [
        ['Origination Fee', `$${parseFloat(generatedQuote.originationFee).toLocaleString()}`],
        ['Points', `$${parseFloat(generatedQuote.points).toLocaleString()}`],
        ['Appraisal', `$${parseFloat(generatedQuote.appraisalFee).toLocaleString()}`],
        ['Title Insurance', `$${parseFloat(generatedQuote.titleInsurance).toLocaleString()}`],
        ['Title Search', `$${parseFloat(generatedQuote.titleSearch).toLocaleString()}`],
        ['Survey', `$${parseFloat(generatedQuote.survey).toLocaleString()}`],
      ];

      feeItems.forEach(item => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = margin;
        }
        doc.setTextColor(75, 85, 99);
        doc.text(item[0], margin + 5, yPos);
        doc.setTextColor(31, 41, 55);
        doc.text(item[1], pageWidth - margin - doc.getTextWidth(item[1]), yPos);
        yPos += 4;
      });

      // Total Cost
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      yPos += 5;
      doc.setFillColor(31, 41, 55);
      doc.rect(margin, yPos, contentWidth, 20, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('Total Cost of Loan', margin + 5, yPos + 6);
      doc.setFontSize(16);
      doc.text(`$${parseFloat(generatedQuote.totalCostOfLoan).toLocaleString()}`, pageWidth - margin - doc.getTextWidth(`$${parseFloat(generatedQuote.totalCostOfLoan).toLocaleString()}`), yPos + 12);
      doc.setFontSize(10);
      doc.text(`${generatedQuote.apr}% APR`, margin + 5, yPos + 18);

      doc.save(`quote-${generatedQuote.borrowerName.replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const isFormValid = quoteData.borrowerName && quoteData.loanAmount && quoteData.interestRate;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <FileOutput className="h-8 w-8 text-blue-600" />
          Quote Generator
        </h1>
        <p className="text-gray-500 mt-2">Create professional, comprehensive loan quotes in seconds</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Quote</TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedQuote}>Preview & Send</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Borrower Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Borrower Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Borrower Name</Label>
                  <Input
                    placeholder="John Smith"
                    value={quoteData.borrowerName}
                    onChange={(e) => setQuoteData({...quoteData, borrowerName: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={quoteData.borrowerEmail}
                    onChange={(e) => setQuoteData({...quoteData, borrowerEmail: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Property Address</Label>
                  <Input
                    placeholder="123 Main St, City, State"
                    value={quoteData.propertyAddress}
                    onChange={(e) => setQuoteData({...quoteData, propertyAddress: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Property Value ($)</Label>
                  <Input
                    type="number"
                    placeholder="625,000"
                    value={quoteData.propertyValue}
                    onChange={(e) => setQuoteData({...quoteData, propertyValue: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Loan Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Loan Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Loan Product</Label>
                  <Select
                    value={quoteData.loanProduct}
                    onValueChange={(v) => setQuoteData({...quoteData, loanProduct: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DSCR">DSCR</SelectItem>
                      <SelectItem value="DSCR - No Ratio">DSCR - No Ratio</SelectItem>
                      <SelectItem value="DSCR Blanket">DSCR Blanket</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Hard Money">Hard Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Loan Purpose</Label>
                  <Select
                    value={quoteData.loanPurpose}
                    onValueChange={(v) => setQuoteData({...quoteData, loanPurpose: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Refinance">Refinance</SelectItem>
                      <SelectItem value="Cash-Out Refinance">Cash-Out Refinance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Loan Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Loan Terms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Loan Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="500,000"
                    value={quoteData.loanAmount}
                    onChange={(e) => setQuoteData({...quoteData, loanAmount: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.125"
                      placeholder="7.5"
                      value={quoteData.interestRate}
                      onChange={(e) => setQuoteData({...quoteData, interestRate: e.target.value})}
                    />
                  </div>
                  <div>
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
                        <SelectItem value="20">20 Years</SelectItem>
                        <SelectItem value="15">15 Years</SelectItem>
                        <SelectItem value="10">10 Years</SelectItem>
                        <SelectItem value="7">7 Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fees & Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fees & Closing Costs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Origination Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.25"
                    placeholder="1.5"
                    value={quoteData.originationFee}
                    onChange={(e) => setQuoteData({...quoteData, originationFee: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Points ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quoteData.pointsCost}
                    onChange={(e) => setQuoteData({...quoteData, pointsCost: e.target.value})}
                  />
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-3">Third-Party Costs</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Appraisal</Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={quoteData.appraisalFee}
                        onChange={(e) => setQuoteData({...quoteData, appraisalFee: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Title Insurance</Label>
                      <Input
                        type="number"
                        placeholder="1200"
                        value={quoteData.titleInsurance}
                        onChange={(e) => setQuoteData({...quoteData, titleInsurance: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Title Search</Label>
                      <Input
                        type="number"
                        placeholder="300"
                        value={quoteData.titleSearch}
                        onChange={(e) => setQuoteData({...quoteData, titleSearch: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Home Inspection</Label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={quoteData.homeInspection}
                        onChange={(e) => setQuoteData({...quoteData, homeInspection: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Survey</Label>
                      <Input
                        type="number"
                        placeholder="400"
                        value={quoteData.survey}
                        onChange={(e) => setQuoteData({...quoteData, survey: e.target.value})}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Other Fees</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={quoteData.otherFees}
                        onChange={(e) => setQuoteData({...quoteData, otherFees: e.target.value})}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Check */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {quoteData.borrowerName ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                  <span>Borrower name provided</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {quoteData.loanAmount ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                  <span>Loan amount provided</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {quoteData.interestRate ? <Check className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-gray-400" />}
                  <span>Interest rate provided</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button 
            onClick={handleGenerate}
            className="w-full bg-blue-600 hover:bg-blue-500 h-12 text-base"
            disabled={!isFormValid}
          >
            <FileOutput className="h-5 w-5 mr-2" />
            Generate Quote
          </Button>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          {generatedQuote && (
            <>
              {/* Quote Document */}
              <Card className="border-2 border-blue-100">
                <CardHeader className="border-b bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      <div>
                        <CardTitle>LoanGenius Quote</CardTitle>
                        <CardDescription>Professional Loan Quote</CardDescription>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      Generated: {generatedQuote.generatedAt}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  {/* Borrower & Property */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">BORROWER</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-600">Name:</span> {generatedQuote.borrowerName}</p>
                        <p><span className="text-gray-600">Email:</span> {generatedQuote.borrowerEmail}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-3">PROPERTY</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-600">Address:</span> {generatedQuote.propertyAddress}</p>
                        <p><span className="text-gray-600">Value:</span> ${parseFloat(generatedQuote.propertyValue).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Loan Terms Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 uppercase">Loan Amount</div>
                      <div className="text-xl font-bold text-blue-600 mt-2">
                        ${parseFloat(generatedQuote.loanAmount).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 uppercase">Rate</div>
                      <div className="text-xl font-bold text-purple-600 mt-2">
                        {generatedQuote.interestRate}%
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 uppercase">LTV</div>
                      <div className="text-xl font-bold text-green-600 mt-2">
                        {generatedQuote.ltv}%
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-xs text-gray-600 uppercase">DSCR</div>
                      <div className="text-xl font-bold text-orange-600 mt-2">
                        {generatedQuote.dscr}
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">PAYMENT SUMMARY</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly P&I</span>
                        <span className="font-bold">${parseFloat(generatedQuote.monthlyPayment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Payments ({generatedQuote.term} years)</span>
                        <span className="font-bold">${parseFloat(generatedQuote.totalPayment).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Total Interest</span>
                        <span>${(parseFloat(generatedQuote.totalPayment) - parseFloat(generatedQuote.loanAmount)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fees Breakdown */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">LENDER FEES</h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Origination Fee</span>
                        <span>${parseFloat(generatedQuote.originationFee).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Points</span>
                        <span>${parseFloat(generatedQuote.points).toLocaleString()}</span>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-4">THIRD-PARTY COSTS</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Appraisal Fee</span>
                        <span>${parseFloat(generatedQuote.appraisalFee || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Title Insurance</span>
                        <span>${parseFloat(generatedQuote.titleInsurance || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Title Search</span>
                        <span>${parseFloat(generatedQuote.titleSearch || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Home Inspection</span>
                        <span>${parseFloat(generatedQuote.homeInspection || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Survey</span>
                        <span>${parseFloat(generatedQuote.survey || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Other Fees</span>
                        <span>${parseFloat(generatedQuote.otherFees || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-bold">
                        <span>Total Third-Party Costs</span>
                        <span>${parseFloat(generatedQuote.totalClosingCosts).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between border-t pt-3 mt-3 font-bold text-base">
                      <span>Total Closing Costs</span>
                      <span>${(parseFloat(generatedQuote.originationFee) + parseFloat(generatedQuote.points) + parseFloat(generatedQuote.totalClosingCosts)).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase">Total Upfront</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        ${parseFloat(generatedQuote.totalUpfrontCosts).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                      <p className="text-xs text-gray-600 uppercase">Total Interest</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        ${(parseFloat(generatedQuote.totalPayment) - parseFloat(generatedQuote.loanAmount)).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Comparison Tool */}
                  <ComparisonTool baseQuote={generatedQuote} />

                  {/* Amortization Schedule */}
                  <AmortizationSchedule 
                    loanAmount={parseFloat(generatedQuote.loanAmount)}
                    rate={parseFloat(generatedQuote.interestRate)}
                    termYears={parseInt(generatedQuote.term)}
                  />

                  {/* Total Cost */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 rounded-xl shadow-xl">
                    <div className="text-center">
                      <div className="text-sm opacity-80 uppercase tracking-wider">Total Cost of Loan</div>
                      <div className="text-5xl font-black mt-3">${parseFloat(generatedQuote.totalCostOfLoan).toLocaleString()}</div>
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <span className="text-lg font-semibold">{generatedQuote.apr}% APR</span>
                      </div>
                      <p className="text-xs opacity-60 mt-3">This quote is valid for 7 days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setTab('generate')}
                  className="flex-1"
                >
                  Back to Edit
                </Button>
                <Button 
                  onClick={downloadPDF}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <SendQuoteButton quote={generatedQuote} />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}