import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Save,
  Send,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileOutput,
} from 'lucide-react';
import QuoteGeneratorModal from '@/components/QuoteGeneratorModal';

export default function LoanApplication() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [aiAssistant, setAiAssistant] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  const steps = [
    { 
      id: 'loan-type',
      name: 'Loan Type', 
      description: 'Select your loan product and purpose',
      fields: ['loan_product', 'loan_purpose'] 
    },
    { 
      id: 'borrower',
      name: 'Borrower', 
      description: 'Your personal information',
      fields: ['first_name', 'last_name', 'email', 'phone', 'ssn', 'dob'] 
    },
    { 
      id: 'entity',
      name: 'Business Entity', 
      description: 'Entity ownership information',
      fields: ['entity_type', 'entity_name', 'ownership_percent'] 
    },
    { 
      id: 'property',
      name: 'Property', 
      description: 'Property details and information',
      fields: ['address', 'city', 'state', 'zip', 'property_type', 'property_value'] 
    },
    { 
      id: 'income',
      name: 'Income', 
      description: 'Rental and other income',
      fields: ['gross_rent', 'other_income', 'vacancy_rate'] 
    },
    { 
      id: 'liabilities',
      name: 'Liabilities', 
      description: 'Debts and obligations',
      fields: ['existing_loan_balance', 'monthly_debts', 'other_liabilities'] 
    },
    { 
      id: 'loan-terms',
      name: 'Loan Terms', 
      description: 'Desired loan structure',
      fields: ['loan_amount', 'interest_rate', 'loan_term_months'] 
    },
    { 
      id: 'consents',
      name: 'Consents & Docs', 
      description: 'Legal agreements and disclosures',
      fields: ['credit_check', 'background_check', 'disclosures', 'privacy'] 
    },
    { 
      id: 'review',
      name: 'Review', 
      description: 'Review and submit',
      fields: [] 
    },
  ];

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAIFill = async () => {
    setAutoFillLoading(true);
    try {
      // Simulate AI filling in the form with typical values
      const aiSuggestions = {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        entity_type: 'LLC',
        entity_name: 'Smith Holdings LLC',
        ownership_percent: 100,
        address: '123 Oak Street',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        property_type: 'Multi-Family',
        property_value: 1000000,
        gross_rent: 8500,
        other_income: 0,
        vacancy_rate: 5,
        existing_loan_balance: 300000,
        monthly_debts: 2000,
      };

      Object.entries(aiSuggestions).forEach(([key, value]) => {
        updateField(key, value);
      });

      setTimeout(() => setAutoFillLoading(false), 1000);
    } catch (error) {
      console.error('AI fill error:', error);
      setAutoFillLoading(false);
    }
  };

  const canProceed = () => {
    // Allow proceeding without all fields filled (optional fields)
    // Only truly required fields should be checked per step
    if (step.id === 'loan-type') {
      return formData.loan_product && formData.loan_purpose;
    }
    if (step.id === 'borrower') {
      return formData.first_name && formData.last_name;
    }
    if (step.id === 'consents') {
      return formData.credit_check && formData.disclosures && formData.privacy;
    }
    // For other steps, allow proceeding
    return true;
  };

  const renderStepContent = () => {
    switch (step.id) {
      case 'loan-type':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Loan Product</Label>
              <Select
                value={formData.loan_product || ''}
                onValueChange={(v) => updateField('loan_product', v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select loan product" />
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
              <Label className="text-base font-semibold mb-3 block">Loan Purpose</Label>
              <Select
                value={formData.loan_purpose || ''}
                onValueChange={(v) => updateField('loan_purpose', v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Refinance">Refinance</SelectItem>
                  <SelectItem value="Cash-Out Refinance">Cash-Out Refinance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'borrower':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name" className="mb-2 block">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={formData.first_name || ''}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="last_name" className="mb-2 block">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Smith"
                  value={formData.last_name || ''}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email" className="mb-2 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="mb-2 block">Phone</Label>
              <Input
                id="phone"
                placeholder="(555) 123-4567"
                value={formData.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="ssn" className="mb-2 block">Social Security Number</Label>
              <Input
                id="ssn"
                type="password"
                placeholder="•••-••-••••"
                value={formData.ssn || ''}
                onChange={(e) => updateField('ssn', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="dob" className="mb-2 block">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.dob || ''}
                onChange={(e) => updateField('dob', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        );

      case 'entity':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="entity_type" className="mb-2 block">Entity Type</Label>
              <Select
                value={formData.entity_type || ''}
                onValueChange={(v) => updateField('entity_type', v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLC">LLC</SelectItem>
                  <SelectItem value="C-Corp">C-Corp</SelectItem>
                  <SelectItem value="S-Corp">S-Corp</SelectItem>
                  <SelectItem value="Partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="entity_name" className="mb-2 block">Entity Name</Label>
              <Input
                id="entity_name"
                placeholder="Your Company LLC"
                value={formData.entity_name || ''}
                onChange={(e) => updateField('entity_name', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="ownership_percent" className="mb-2 block">Ownership Percentage</Label>
              <Input
                id="ownership_percent"
                type="number"
                placeholder="100"
                value={formData.ownership_percent || ''}
                onChange={(e) => updateField('ownership_percent', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        );

      case 'property':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="address" className="mb-2 block">Street Address</Label>
              <Input
                id="address"
                placeholder="123 Main St"
                value={formData.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city" className="mb-2 block">City</Label>
                <Input
                  id="city"
                  placeholder="San Francisco"
                  value={formData.city || ''}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="state" className="mb-2 block">State</Label>
                <Input
                  id="state"
                  placeholder="CA"
                  value={formData.state || ''}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="zip" className="mb-2 block">ZIP</Label>
                <Input
                  id="zip"
                  placeholder="94102"
                  value={formData.zip || ''}
                  onChange={(e) => updateField('zip', e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="property_type" className="mb-2 block">Property Type</Label>
              <Select
                value={formData.property_type || ''}
                onValueChange={(v) => updateField('property_type', v)}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SFR">Single Family</SelectItem>
                  <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="property_value" className="mb-2 block">Property Value ($)</Label>
              <Input
                id="property_value"
                type="number"
                placeholder="1,000,000"
                value={formData.property_value || ''}
                onChange={(e) => updateField('property_value', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        );

      case 'income':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="gross_rent" className="mb-2 block">Gross Monthly Rent Income ($)</Label>
              <Input
                id="gross_rent"
                type="number"
                placeholder="8,500"
                value={formData.gross_rent || ''}
                onChange={(e) => updateField('gross_rent', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="other_income" className="mb-2 block">Other Monthly Income ($)</Label>
              <Input
                id="other_income"
                type="number"
                placeholder="0"
                value={formData.other_income || ''}
                onChange={(e) => updateField('other_income', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="vacancy_rate" className="mb-2 block">Expected Vacancy Rate (%)</Label>
              <Input
                id="vacancy_rate"
                type="number"
                placeholder="5"
                value={formData.vacancy_rate || ''}
                onChange={(e) => updateField('vacancy_rate', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        );

      case 'liabilities':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="existing_loan_balance" className="mb-2 block">Existing Loan Balance ($)</Label>
              <Input
                id="existing_loan_balance"
                type="number"
                placeholder="300,000"
                value={formData.existing_loan_balance || ''}
                onChange={(e) => updateField('existing_loan_balance', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="monthly_debts" className="mb-2 block">Monthly Debt Obligations ($)</Label>
              <Input
                id="monthly_debts"
                type="number"
                placeholder="2,000"
                value={formData.monthly_debts || ''}
                onChange={(e) => updateField('monthly_debts', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="other_liabilities" className="mb-2 block">Other Liabilities ($)</Label>
              <Input
                id="other_liabilities"
                type="number"
                placeholder="0"
                value={formData.other_liabilities || ''}
                onChange={(e) => updateField('other_liabilities', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        );

      case 'loan-terms':
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="loan_amount" className="mb-2 block">Desired Loan Amount ($)</Label>
              <Input
                id="loan_amount"
                type="number"
                placeholder="500,000"
                value={formData.loan_amount || ''}
                onChange={(e) => updateField('loan_amount', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="interest_rate" className="mb-2 block">Expected Interest Rate (%)</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.125"
                placeholder="7.5"
                value={formData.interest_rate || ''}
                onChange={(e) => updateField('interest_rate', e.target.value)}
                className="h-11"
              />
            </div>
            <div>
              <Label htmlFor="loan_term_months" className="mb-2 block">Loan Term (Months)</Label>
              <Input
                id="loan_term_months"
                type="number"
                placeholder="360"
                value={formData.loan_term_months || ''}
                onChange={(e) => updateField('loan_term_months', e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        );

      case 'consents':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <Checkbox
                id="credit_check"
                checked={formData.credit_check || false}
                onCheckedChange={(v) => updateField('credit_check', v)}
              />
              <Label htmlFor="credit_check" className="flex-1 cursor-pointer">
                <div className="font-semibold">Credit Check Authorization</div>
                <div className="text-sm text-gray-600">I authorize a hard credit inquiry</div>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
              <Checkbox
                id="background_check"
                checked={formData.background_check || false}
                onCheckedChange={(v) => updateField('background_check', v)}
              />
              <Label htmlFor="background_check" className="flex-1 cursor-pointer">
                <div className="font-semibold">Background Check</div>
                <div className="text-sm text-gray-600">I consent to a background verification</div>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Checkbox
                id="disclosures"
                checked={formData.disclosures || false}
                onCheckedChange={(v) => updateField('disclosures', v)}
              />
              <Label htmlFor="disclosures" className="flex-1 cursor-pointer">
                <div className="font-semibold">Loan Disclosures</div>
                <div className="text-sm text-gray-600">I have reviewed and agree to all loan disclosures</div>
              </Label>
            </div>
            <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg">
              <Checkbox
                id="privacy"
                checked={formData.privacy || false}
                onCheckedChange={(v) => updateField('privacy', v)}
              />
              <Label htmlFor="privacy" className="flex-1 cursor-pointer">
                <div className="font-semibold">Privacy Policy</div>
                <div className="text-sm text-gray-600">I agree to the privacy policy and data handling</div>
              </Label>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 ml-2">
                Your application is complete and ready to submit!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 mb-2">Loan Product</div>
                  <div className="text-lg font-semibold">{formData.loan_product}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 mb-2">Loan Amount</div>
                  <div className="text-lg font-semibold">${formData.loan_amount ? parseInt(formData.loan_amount).toLocaleString() : '0'}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 mb-2">Borrower</div>
                  <div className="text-lg font-semibold">{formData.first_name} {formData.last_name}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-sm text-gray-600 mb-2">Property</div>
                  <div className="text-lg font-semibold">{formData.address}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Loan Application</h1>
          <p className="text-slate-600 text-lg">
            Step {currentStep + 1} of {steps.length}: {step.name}
          </p>
          <p className="text-slate-500 text-sm mt-1">{step.description}</p>

          {/* Progress Bar */}
          <div className="mt-6 h-2.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quote Tool */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => setQuoteModalOpen(true)}
          >
            <FileOutput className="h-4 w-4" />
            Generate Quote
          </Button>
        </div>

        {/* AI Assistant Toggle */}
         {!aiAssistant && (
           <Card className="mb-6 border-blue-100 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-semibold text-slate-900">AI Assistant Available</div>
                    <div className="text-sm text-slate-600">Let AI help fill in your application</div>
                  </div>
                </div>
                <Button
                  onClick={handleAIFill}
                  disabled={autoFillLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {autoFillLoading ? 'Filling...' : 'Use AI'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form Card */}
        <Card className="mb-8 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle>{step.name}</CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              className="ml-auto gap-2 bg-green-600 hover:bg-green-700 h-11 px-8"
              onClick={async () => {
                try {
                  const user = await base44.auth.me();
                  // Get org membership
                  const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
                  const orgId = memberships[0]?.org_id || user?.org_id || 'default';
                  
                  // Create a deal from the application
                  const deal = await base44.entities.Deal.create({
                    org_id: orgId,
                    loan_product: formData.loan_product || 'DSCR',
                    loan_purpose: formData.loan_purpose || 'Purchase',
                    loan_amount: parseFloat(formData.loan_amount) || 0,
                    interest_rate: parseFloat(formData.interest_rate) || 0,
                    loan_term_months: parseInt(formData.loan_term_months) || 360,
                    stage: 'application',
                    status: 'active'
                  });
                  
                  // Create borrower
                  if (formData.first_name && formData.last_name) {
                    await base44.entities.Borrower.create({
                      org_id: orgId,
                      first_name: formData.first_name,
                      last_name: formData.last_name,
                      email: formData.email || '',
                      phone: formData.phone || ''
                    });
                  }
                  
                  alert('Application submitted successfully! Deal created.');
                  window.location.href = `/Pipeline`;
                } catch (error) {
                  alert('Error submitting application: ' + error.message);
                }
              }}
            >
              <Check className="h-4 w-4" />
              Submit Application
            </Button>
          ) : (
            <Button
              className="ml-auto gap-2 h-11 px-8 bg-blue-600 hover:bg-blue-700"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Step Indicators */}
        <div className="mt-12 flex gap-2 flex-wrap justify-center">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`h-10 px-4 rounded-lg text-sm font-medium transition-all ${
                idx === currentStep
                  ? 'bg-blue-600 text-white shadow-lg'
                  : idx < currentStep
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
            </button>
          ))}
        </div>

        <QuoteGeneratorModal
          isOpen={quoteModalOpen}
          onClose={() => setQuoteModalOpen(false)}
          lead={{
            name: `${formData.first_name || ''} ${formData.last_name || ''}`,
            email: formData.email || '',
            property_address: formData.address || '',
          }}
        />
      </div>
    </div>
  );
}