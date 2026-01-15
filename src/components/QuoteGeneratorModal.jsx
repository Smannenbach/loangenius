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
import { FileOutput, Download, Send, Loader } from 'lucide-react';

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
      alert('Quote sent successfully!');
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileOutput className="h-5 w-5" />
            Generate Loan Quote
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedQuote}>Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Borrower Name</Label>
                <Input
                  value={quoteData.borrowerName}
                  onChange={(e) => setQuoteData({...quoteData, borrowerName: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={quoteData.borrowerEmail}
                  onChange={(e) => setQuoteData({...quoteData, borrowerEmail: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <Label>Property Address</Label>
                <Input
                  value={quoteData.propertyAddress}
                  onChange={(e) => setQuoteData({...quoteData, propertyAddress: e.target.value})}
                />
              </div>
              <div>
                <Label>Property Value ($)</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={quoteData.propertyValue}
                  onChange={(e) => setQuoteData({...quoteData, propertyValue: e.target.value})}
                />
              </div>
              <div>
                <Label>Loan Amount ($)</Label>
                <Input
                  type="number"
                  placeholder="400000"
                  value={quoteData.loanAmount}
                  onChange={(e) => setQuoteData({...quoteData, loanAmount: e.target.value})}
                />
              </div>
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
                <Input
                  type="number"
                  placeholder="30"
                  value={quoteData.term}
                  onChange={(e) => setQuoteData({...quoteData, term: e.target.value})}
                />
              </div>
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
            </div>

            <Button onClick={handleGenerate} className="w-full bg-blue-600 hover:bg-blue-700">
              Generate Quote
            </Button>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            {generatedQuote && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Loan Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly P&I</span>
                      <span className="font-semibold">${parseFloat(generatedQuote.monthlyPayment).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">LTV</span>
                      <span className="font-semibold">{generatedQuote.ltv}%</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total Closing Costs</span>
                      <span>${(parseFloat(generatedQuote.originationFee) + parseFloat(generatedQuote.totalClosingCosts)).toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-900 text-white p-4 rounded-lg mt-4 text-center">
                      <p className="text-xs opacity-75">Total Cost</p>
                      <p className="text-2xl font-bold">${parseFloat(generatedQuote.totalCostOfLoan).toLocaleString()}</p>
                      <p className="text-sm mt-2">{generatedQuote.apr}% APR</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTab('generate')} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
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
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}