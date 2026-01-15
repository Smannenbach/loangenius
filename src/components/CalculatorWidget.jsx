import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign } from 'lucide-react';

export default function CalculatorWidget() {
  const [dscrInputs, setDscrInputs] = useState({
    loanAmount: '',
    interestRate: '',
    monthlyRent: '',
    annualTaxes: '',
    annualInsurance: '',
    monthlyHoa: '0',
  });
  const [dscrResult, setDscrResult] = useState(null);

  const [paymentInputs, setPaymentInputs] = useState({
    loanAmount: '',
    interestRate: '',
    termYears: '30',
  });
  const [paymentResult, setPaymentResult] = useState(null);

  const calculateDSCR = () => {
    const loanAmount = parseFloat(dscrInputs.loanAmount) || 0;
    const rate = parseFloat(dscrInputs.interestRate) / 100 || 0;
    const termMonths = 360;
    const monthlyRent = parseFloat(dscrInputs.monthlyRent) || 0;
    const annualTaxes = parseFloat(dscrInputs.annualTaxes) || 0;
    const annualInsurance = parseFloat(dscrInputs.annualInsurance) || 0;
    const monthlyHoa = parseFloat(dscrInputs.monthlyHoa) || 0;

    const monthlyRate = rate / 12;
    let monthlyPi = 0;
    if (monthlyRate > 0 && loanAmount > 0) {
      monthlyPi = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                  (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    const monthlyTaxes = annualTaxes / 12;
    const monthlyInsurance = annualInsurance / 12;
    const totalMonthly = monthlyPi + monthlyTaxes + monthlyInsurance + monthlyHoa;
    const dscr = totalMonthly > 0 ? monthlyRent / totalMonthly : 0;

    setDscrResult({
      monthlyPi: monthlyPi.toFixed(2),
      totalMonthly: totalMonthly.toFixed(2),
      dscr: dscr.toFixed(3),
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
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Loan Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dscr" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dscr" className="gap-2 text-sm">
              <TrendingUp className="h-3 w-3" />
              DSCR
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2 text-sm">
              <DollarSign className="h-3 w-3" />
              Payment
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dscr" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Loan Amount</Label>
                <Input
                  type="number"
                  size="sm"
                  placeholder="500000"
                  value={dscrInputs.loanAmount}
                  onChange={(e) => setDscrInputs({...dscrInputs, loanAmount: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Interest Rate %</Label>
                <Input
                  type="number"
                  step="0.125"
                  placeholder="7.5"
                  value={dscrInputs.interestRate}
                  onChange={(e) => setDscrInputs({...dscrInputs, interestRate: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Monthly Rent</Label>
                <Input
                  type="number"
                  placeholder="8500"
                  value={dscrInputs.monthlyRent}
                  onChange={(e) => setDscrInputs({...dscrInputs, monthlyRent: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Annual Taxes</Label>
                <Input
                  type="number"
                  placeholder="6000"
                  value={dscrInputs.annualTaxes}
                  onChange={(e) => setDscrInputs({...dscrInputs, annualTaxes: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button onClick={calculateDSCR} className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700">
              Calculate
            </Button>
            {dscrResult && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-600">DSCR</p>
                  <p className={`text-2xl font-bold ${
                    parseFloat(dscrResult.dscr) >= 1.25 ? 'text-green-600' :
                    parseFloat(dscrResult.dscr) >= 1.0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {dscrResult.dscr}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payment" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Loan Amount</Label>
                <Input
                  type="number"
                  placeholder="500000"
                  value={paymentInputs.loanAmount}
                  onChange={(e) => setPaymentInputs({...paymentInputs, loanAmount: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Interest Rate %</Label>
                <Input
                  type="number"
                  step="0.125"
                  placeholder="7.5"
                  value={paymentInputs.interestRate}
                  onChange={(e) => setPaymentInputs({...paymentInputs, interestRate: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Term (Years)</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={paymentInputs.termYears}
                  onChange={(e) => setPaymentInputs({...paymentInputs, termYears: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <Button onClick={calculatePayment} className="w-full h-9 text-sm bg-blue-600 hover:bg-blue-700">
              Calculate
            </Button>
            {paymentResult && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Monthly Payment</p>
                  <p className="text-xl font-bold text-blue-600">${parseFloat(paymentResult.monthlyPayment).toLocaleString()}</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}