import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, TrendingUp, DollarSign, Home, CreditCard, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function PreQualificationCheck({ orgId, onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Borrower info
    credit_score_range: '',
    estimated_assets: '',
    
    // Loan info
    loan_type: 'DSCR',
    loan_amount: '',
    interest_rate: '7.5',
    term_months: '360',
    
    // Property info
    property_value: '',
    monthly_rent: '',
    annual_taxes: '',
    annual_insurance: '',
    monthly_hoa: '0'
  });
  const [result, setResult] = useState(null);

  const preQualMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('preQualifyBorrower', {
        org_id: orgId,
        borrower_data: {
          credit_score_range: formData.credit_score_range,
          estimated_assets: parseFloat(formData.estimated_assets) || 0
        },
        loan_data: {
          loan_type: formData.loan_type,
          loan_amount: formData.loan_amount,
          interest_rate: formData.interest_rate,
          term_months: formData.term_months
        },
        property_data: {
          property_value: formData.property_value,
          monthly_rent: formData.monthly_rent,
          annual_taxes: formData.annual_taxes,
          annual_insurance: formData.annual_insurance,
          monthly_hoa: formData.monthly_hoa
        }
      });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep(4);
    },
    onError: (error) => {
      toast.error('Pre-qualification check failed: ' + error.message);
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 1) return formData.credit_score_range && formData.estimated_assets;
    if (step === 2) return formData.loan_amount && formData.property_value;
    if (step === 3) return formData.monthly_rent && formData.annual_taxes && formData.annual_insurance;
    return true;
  };

  const handleNext = () => {
    if (step === 3) {
      preQualMutation.mutate();
    } else {
      setStep(step + 1);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'passed') return <CheckCircle2 className="h-8 w-8 text-green-500" />;
    if (status === 'failed') return <XCircle className="h-8 w-8 text-red-500" />;
    return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
  };

  const getStatusColor = (status) => {
    if (status === 'passed') return 'bg-green-50 border-green-200';
    if (status === 'failed') return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Pre-Qualification Check</span>
          <span>Step {step} of 4</span>
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
      </div>

      {/* Step 1: Borrower Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Your Financial Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-sm">Let's start with some basic information to see if you pre-qualify.</p>
            
            <div className="space-y-2">
              <Label>Estimated Credit Score Range *</Label>
              <Select value={formData.credit_score_range} onValueChange={(v) => handleChange('credit_score_range', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your credit score range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent_750+">Excellent (750+)</SelectItem>
                  <SelectItem value="good_700-749">Good (700-749)</SelectItem>
                  <SelectItem value="fair_650-699">Fair (650-699)</SelectItem>
                  <SelectItem value="poor_below_650">Below 650</SelectItem>
                  <SelectItem value="unknown">I don't know</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estimated Liquid Assets ($) *</Label>
              <Input 
                type="number"
                placeholder="50000"
                value={formData.estimated_assets}
                onChange={(e) => handleChange('estimated_assets', e.target.value)}
              />
              <p className="text-xs text-gray-500">Include checking, savings, investments (not retirement)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Loan Info */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={formData.loan_type} onValueChange={(v) => handleChange('loan_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DSCR">DSCR</SelectItem>
                    <SelectItem value="DSCR - No Ratio">DSCR No-Ratio</SelectItem>
                    <SelectItem value="Hard Money">Hard Money</SelectItem>
                    <SelectItem value="Bridge">Bridge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input 
                  type="number"
                  step="0.125"
                  value={formData.interest_rate}
                  onChange={(e) => handleChange('interest_rate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Amount ($) *</Label>
                <Input 
                  type="number"
                  placeholder="375000"
                  value={formData.loan_amount}
                  onChange={(e) => handleChange('loan_amount', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Property Value ($) *</Label>
                <Input 
                  type="number"
                  placeholder="500000"
                  value={formData.property_value}
                  onChange={(e) => handleChange('property_value', e.target.value)}
                />
              </div>
            </div>

            {formData.loan_amount && formData.property_value && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estimated LTV:</span>
                  <span className="font-semibold">
                    {((parseFloat(formData.loan_amount) / parseFloat(formData.property_value)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Property Income */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-blue-600" />
              Property Income & Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Monthly Rental Income ($) *</Label>
              <Input 
                type="number"
                placeholder="3000"
                value={formData.monthly_rent}
                onChange={(e) => handleChange('monthly_rent', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Annual Property Taxes ($) *</Label>
                <Input 
                  type="number"
                  placeholder="6000"
                  value={formData.annual_taxes}
                  onChange={(e) => handleChange('annual_taxes', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Annual Insurance ($) *</Label>
                <Input 
                  type="number"
                  placeholder="2400"
                  value={formData.annual_insurance}
                  onChange={(e) => handleChange('annual_insurance', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monthly HOA ($)</Label>
              <Input 
                type="number"
                placeholder="0"
                value={formData.monthly_hoa}
                onChange={(e) => handleChange('monthly_hoa', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <Card className={`border-2 ${getStatusColor(result.prequalification?.status)}`}>
          <CardHeader>
            <div className="flex items-center gap-3">
              {getStatusIcon(result.prequalification?.status)}
              <div>
                <CardTitle>
                  {result.prequalification?.status === 'passed' && 'Congratulations! You Pre-Qualify'}
                  {result.prequalification?.status === 'needs_review' && 'Pre-Qualification Needs Review'}
                  {result.prequalification?.status === 'failed' && 'Pre-Qualification Not Met'}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Based on the information provided
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-lg border text-center">
                <p className="text-xs text-gray-500">LTV</p>
                <p className="text-lg font-bold">{result.summary?.ltv}%</p>
              </div>
              <div className="p-3 bg-white rounded-lg border text-center">
                <p className="text-xs text-gray-500">DSCR</p>
                <p className="text-lg font-bold">{result.summary?.dscr}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border text-center">
                <p className="text-xs text-gray-500">Est. Payment</p>
                <p className="text-lg font-bold">${parseInt(result.summary?.monthlyPayment || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="p-4 bg-white rounded-lg border">
              <p className="text-sm font-medium text-gray-700 mb-2">Recommendation:</p>
              <p className="text-sm text-gray-600">{result.prequalification?.ai_recommendation}</p>
            </div>

            {/* Checks */}
            {result.prequalification?.checks_passed?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">✓ Passed Checks:</p>
                {result.prequalification.checks_passed.map((check, i) => (
                  <p key={i} className="text-sm text-gray-600 pl-4">• {check}</p>
                ))}
              </div>
            )}

            {result.prequalification?.checks_warnings?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-yellow-700">⚠ Warnings:</p>
                {result.prequalification.checks_warnings.map((check, i) => (
                  <p key={i} className="text-sm text-gray-600 pl-4">• {check}</p>
                ))}
              </div>
            )}

            {result.prequalification?.checks_failed?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">✗ Issues:</p>
                {result.prequalification.checks_failed.map((check, i) => (
                  <p key={i} className="text-sm text-gray-600 pl-4">• {check}</p>
                ))}
              </div>
            )}

            {/* Next Steps */}
            {result.prequalification?.next_steps?.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  {result.prequalification.next_steps.map((step, i) => (
                    <li key={i} className="text-sm text-blue-700">{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        {step < 4 ? (
          <>
            <Button variant="ghost" onClick={onSkip}>
              Skip Pre-Qualification
            </Button>
            <Button 
              onClick={handleNext}
              disabled={!canProceed() || preQualMutation.isPending}
              className="gap-2"
            >
              {preQualMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : step === 3 ? (
                'Check Pre-Qualification'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep(1)}>
              Start Over
            </Button>
            <Button onClick={() => onComplete(result)} className="gap-2 bg-blue-600 hover:bg-blue-700">
              Continue to Application
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}