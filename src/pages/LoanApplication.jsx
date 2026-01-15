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
import { AlertCircle, ChevronRight, ChevronLeft, Check, Save, Send } from 'lucide-react';

export default function LoanApplication() {
  const queryClient = useQueryClient();
  const [applicationId, setApplicationId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loanProduct, setLoanProduct] = useState('DSCR');
  const [loanPurpose, setLoanPurpose] = useState('Purchase');
  const [savedStatus, setSavedStatus] = useState('');
  const [showCoBorrowerForm, setShowCoBorrowerForm] = useState(false);
  const [coBorrowerEmail, setCoBorrowerEmail] = useState('');
  const [coBorrowerName, setCoBorrowerName] = useState('');
  const [formData, setFormData] = useState({});
  const [stepData, setStepData] = useState({});

  const steps = [
    { name: 'Borrower', fields: ['first_name', 'last_name', 'email', 'phone'] },
    { name: 'Entity', fields: ['entity_type', 'entity_name'] },
    { name: 'Property', fields: ['address', 'city', 'state', 'property_type'] },
    { name: 'Income', fields: ['gross_rent', 'other_income'] },
    { name: 'Liabilities', fields: ['existing_loan_balance', 'monthly_debts'] },
    { name: 'Terms', fields: ['loan_amount', 'interest_rate', 'loan_term_months'] },
    { name: 'Consents', fields: ['credit_check', 'background_check', 'disclosures'] },
    { name: 'Review', fields: [] }
  ];

  // Initialize application
  useEffect(() => {
    const initApp = async () => {
      if (!applicationId) {
        const result = await base44.functions.invoke('applicationService', {
          action: 'create_application',
          org_id: 'default', // TODO: get from user context
          data: {}
        });
        if (result.data.success) {
          setApplicationId(result.data.application.id);
        }
      }
    };
    initApp();
  }, []);

  // Autosave on step data change
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (applicationId && stepData[steps[currentStep].name]) {
        try {
          const result = await base44.functions.invoke('applicationService', {
            action: 'autosave_step',
            org_id: 'default',
            data: {
              application_id: applicationId,
              step_index: currentStep,
              step_name: steps[currentStep].name,
              form_data: stepData[steps[currentStep].name]
            }
          });
          if (result.data.success) {
            setSavedStatus('✓ Saved');
            setTimeout(() => setSavedStatus(''), 2000);
          }
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [stepData, currentStep, applicationId]);

  const handleFieldChange = (field, value) => {
    const stepName = steps[currentStep].name;
    setStepData(prev => ({
      ...prev,
      [stepName]: {
        ...(prev[stepName] || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      const result = await base44.functions.invoke('applicationService', {
        action: 'submit_application',
        org_id: 'default',
        data: {
          application_id: applicationId,
          loan_product: loanProduct,
          loan_purpose: loanPurpose,
          form_data: stepData
        }
      });

      if (result.data.success) {
        window.location.href = result.data.portal_docs_url;
      }
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleInviteCoBorrower = async () => {
    try {
      const result = await base44.functions.invoke('applicationService', {
        action: 'invite_coborrower',
        org_id: 'default',
        data: {
          application_id: applicationId,
          coborrower_email: coBorrowerEmail,
          coborrower_name: coBorrowerName,
          role: 'co-borrower'
        }
      });

      if (result.data.success) {
        setShowCoBorrowerForm(false);
        setCoBorrowerEmail('');
        setCoBorrowerName('');
      }
    } catch (error) {
      console.error('Invite failed:', error);
    }
  };

  const step = steps[currentStep];
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Loan Application</h1>
          <p className="text-slate-600">Step {currentStep + 1} of {steps.length}: {step.name}</p>
          <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loan Type Selection (Step 0) */}
        {currentStep === 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Loan Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Loan Product</Label>
                <Select value={loanProduct} onValueChange={setLoanProduct}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DSCR">DSCR</SelectItem>
                    <SelectItem value="DSCR - No Ratio">DSCR - No Ratio</SelectItem>
                    <SelectItem value="DSCR Blanket">DSCR Blanket</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Loan Purpose</Label>
                <Select value={loanPurpose} onValueChange={setLoanPurpose}>
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
        )}

        {/* Borrower Step */}
        {step.name === 'Borrower' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="mb-1 block text-sm">First Name</Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={stepData['Borrower']?.first_name || ''}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="mb-1 block text-sm">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={stepData['Borrower']?.last_name || ''}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="mb-1 block text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={stepData['Borrower']?.email || ''}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-1 block text-sm">Phone</Label>
                <Input
                  id="phone"
                  placeholder="(555) 123-4567"
                  value={stepData['Borrower']?.phone || ''}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
              </div>

              {/* Co-borrower section */}
              <div className="border-t pt-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCoBorrowerForm(!showCoBorrowerForm)}
                  className="w-full"
                >
                  {showCoBorrowerForm ? '✕ Cancel' : '+ Add Co-borrower'}
                </Button>

                {showCoBorrowerForm && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-3">
                    <Input
                      placeholder="Co-borrower name"
                      value={coBorrowerName}
                      onChange={(e) => setCoBorrowerName(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder="Co-borrower email"
                      value={coBorrowerEmail}
                      onChange={(e) => setCoBorrowerEmail(e.target.value)}
                    />
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                      onClick={handleInviteCoBorrower}
                    >
                      <Send className="h-4 w-4" />
                      Send Invite
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generic step rendering */}
        {step.name !== 'Borrower' && step.name !== 'Review' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{step.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {step.fields.map(field => (
                <div key={field}>
                  <Label htmlFor={field} className="mb-1 block text-sm capitalize">
                    {field.replace(/_/g, ' ')}
                  </Label>
                  <Input
                    id={field}
                    placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    value={stepData[step.name]?.[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Review Step */}
        {step.name === 'Review' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Review Your Application</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All required information has been provided
                </AlertDescription>
              </Alert>
              <div className="space-y-3 text-sm">
                <p><span className="font-semibold">Loan Product:</span> {loanProduct}</p>
                <p><span className="font-semibold">Loan Purpose:</span> {loanPurpose}</p>
                <p><span className="font-semibold">Borrower:</span> {stepData['Borrower']?.first_name} {stepData['Borrower']?.last_name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saved status */}
        {savedStatus && (
          <div className="mb-4 text-sm text-green-600 flex items-center gap-2">
            <Check className="h-4 w-4" />
            {savedStatus}
          </div>
        )}

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
              className="ml-auto gap-2 bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
            >
              <Check className="h-4 w-4" />
              Submit Application
            </Button>
          ) : (
            <Button
              className="ml-auto gap-2"
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}