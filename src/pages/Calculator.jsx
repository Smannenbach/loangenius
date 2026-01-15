import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign, Percent, TrendingUp, Home } from 'lucide-react';

export default function CalculatorPage() {
  // DSCR Calculator State
  const [dscrInputs, setDscrInputs] = useState({
    loanAmount: '',
    interestRate: '',
    loanTermYears: '30',
    monthlyRent: '',
    annualTaxes: '',
    annualInsurance: '',
    monthlyHoa: '',
    annualFlood: '',
  });
  const [dscrResult, setDscrResult] = useState(null);

  // Payment Calculator State
  const [paymentInputs, setPaymentInputs] = useState({
    loanAmount: '',
    interestRate: '',
    termYears: '30',
  });
  const [paymentResult, setPaymentResult] = useState(null);

  const calculateDSCR = () => {
    const loanAmount = parseFloat(dscrInputs.loanAmount) || 0;
    const rate = parseFloat(dscrInputs.interestRate) / 100 || 0;
    const termMonths = parseInt(dscrInputs.loanTermYears) * 12 || 360;
    const monthlyRent = parseFloat(dscrInputs.monthlyRent) || 0;
    const annualTaxes = parseFloat(dscrInputs.annualTaxes) || 0;
    const annualInsurance = parseFloat(dscrInputs.annualInsurance) || 0;
    const monthlyHoa = parseFloat(dscrInputs.monthlyHoa) || 0;
    const annualFlood = parseFloat(dscrInputs.annualFlood) || 0;

    // Calculate P&I
    const monthlyRate = rate / 12;
    let monthlyPi = 0;
    if (monthlyRate > 0 && loanAmount > 0) {
      monthlyPi = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    // Calculate expenses
    const monthlyTaxes = annualTaxes / 12;
    const monthlyInsurance = annualInsurance / 12;
    const monthlyFlood = annualFlood / 12;

    // Total monthly payment (PITIA + HOA)
    const totalMonthly = monthlyPi + monthlyTaxes + monthlyInsurance + monthlyHoa + monthlyFlood;

    // DSCR = Monthly Rent / Total Monthly Payment
    const dscr = totalMonthly > 0 ? monthlyRent / totalMonthly : 0;

    setDscrResult({
      monthlyPi: monthlyPi.toFixed(2),
      totalMonthly: totalMonthly.toFixed(2),
      dscr: dscr.toFixed(3),
      monthlyTaxes: monthlyTaxes.toFixed(2),
      monthlyInsurance: monthlyInsurance.toFixed(2),
    });
  };

  const calculatePayment = () => {
    const principal = parseFloat(paymentInputs.loanAmount) || 0;
    const annualRate = parseFloat(paymentInputs.interestRate) / 100 || 0;
    const months = parseInt(paymentInputs.termYears) * 12 || 360;

    const monthlyRate = annualRate / 12;
    let payment = 0;
    if (monthlyRate > 0 && principal > 0) {
      payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                (Math.pow(1 + monthlyRate, months) - 1);
    }

    const totalPayment = payment * months;
    const totalInterest = totalPayment - principal;

    setPaymentResult({
      monthlyPayment: payment.toFixed(2),
      totalPayment: totalPayment.toFixed(2),
      totalInterest: totalInterest.toFixed(2),
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Calculator className="h-7 w-7 text-blue-600" />
          Loan Calculator
        </h1>
        <p className="text-gray-500 mt-1">Calculate DSCR, payments, and more</p>
      </div>

      <Tabs defaultValue="dscr" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dscr" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            DSCR Calculator
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dscr">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                DSCR Calculator
              </CardTitle>
              <p className="text-sm text-gray-500">
                DSCR = Monthly Gross Rent / (P&I + Taxes + Insurance + HOA + Flood)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="500,000"
                    value={dscrInputs.loanAmount}
                    onChange={(e) => setDscrInputs({...dscrInputs, loanAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.125"
                    placeholder="7.5"
                    value={dscrInputs.interestRate}
                    onChange={(e) => setDscrInputs({...dscrInputs, interestRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Gross Rent ($)</Label>
                  <Input
                    type="number"
                    placeholder="3,500"
                    value={dscrInputs.monthlyRent}
                    onChange={(e) => setDscrInputs({...dscrInputs, monthlyRent: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Property Taxes ($)</Label>
                  <Input
                    type="number"
                    placeholder="6,000"
                    value={dscrInputs.annualTaxes}
                    onChange={(e) => setDscrInputs({...dscrInputs, annualTaxes: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Hazard Insurance ($)</Label>
                  <Input
                    type="number"
                    placeholder="2,400"
                    value={dscrInputs.annualInsurance}
                    onChange={(e) => setDscrInputs({...dscrInputs, annualInsurance: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly HOA ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={dscrInputs.monthlyHoa}
                    onChange={(e) => setDscrInputs({...dscrInputs, monthlyHoa: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Flood Insurance ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={dscrInputs.annualFlood}
                    onChange={(e) => setDscrInputs({...dscrInputs, annualFlood: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={calculateDSCR} className="w-full bg-blue-600 hover:bg-blue-500">
                Calculate DSCR
              </Button>

              {dscrResult && (
                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-4">Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">DSCR Ratio</p>
                      <p className={`text-3xl font-bold mt-1 ${
                        parseFloat(dscrResult.dscr) >= 1.25 ? 'text-green-600' :
                        parseFloat(dscrResult.dscr) >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {dscrResult.dscr}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {parseFloat(dscrResult.dscr) >= 1.25 ? 'Excellent' :
                         parseFloat(dscrResult.dscr) >= 1.0 ? 'Acceptable' : 'Below Threshold'}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">Monthly P&I</p>
                      <p className="text-xl font-semibold text-gray-900 mt-1">
                        ${parseFloat(dscrResult.monthlyPi).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">Total Monthly</p>
                      <p className="text-xl font-semibold text-gray-900 mt-1">
                        ${parseFloat(dscrResult.totalMonthly).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Payment Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="500,000"
                    value={paymentInputs.loanAmount}
                    onChange={(e) => setPaymentInputs({...paymentInputs, loanAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.125"
                    placeholder="7.5"
                    value={paymentInputs.interestRate}
                    onChange={(e) => setPaymentInputs({...paymentInputs, interestRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Term (Years)</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={paymentInputs.termYears}
                    onChange={(e) => setPaymentInputs({...paymentInputs, termYears: e.target.value})}
                  />
                </div>
              </div>

              <Button onClick={calculatePayment} className="w-full bg-blue-600 hover:bg-blue-500">
                Calculate Payment
              </Button>

              {paymentResult && (
                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-4">Results</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">Monthly Payment</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        ${parseFloat(paymentResult.monthlyPayment).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">Total Payment</p>
                      <p className="text-xl font-semibold text-gray-900 mt-1">
                        ${parseFloat(paymentResult.totalPayment).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <p className="text-sm text-gray-500">Total Interest</p>
                      <p className="text-xl font-semibold text-gray-900 mt-1">
                        ${parseFloat(paymentResult.totalInterest).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}