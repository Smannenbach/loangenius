import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

import Step1Borrower from '@/components/deal-wizard/Step5Borrower';
import Step2LoanType from '@/components/deal-wizard/Step1LoanType';
import Step3Property from '@/components/deal-wizard/Step2Property';
import Step4Valuation from '@/components/deal-wizard/Step3Valuation';
import Step5Expenses from '@/components/deal-wizard/Step4Expenses';
import Step6Review from '@/components/deal-wizard/Step6Review';
import Step7Assets from '@/components/deal-wizard/Step7Assets';
import Step8Declarations from '@/components/deal-wizard/Step9Declarations';

export default function LoanApplicationWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Loan Type & Purpose
    loanType: 'DSCR',
    loanPurpose: 'Purchase',
    isBlanket: false,
    
    // Step 3: Valuation & Loan Terms
    loanAmount: '',
    purchasePrice: '',
    appraisedValue: '',
    interestRate: '',
    rateType: 'Fixed',
    loanTermMonths: 360,
    prepaymentType: 'No Prepayment Penalty',
    
    // Step 4: Expenses
    currentLeaseRent: '',
    marketRent: '',
    annualPropertyTaxes: '',
    annualHomeInsurance: '',
    annualFloodInsurance: '',
    monthlyHOA: '',
    
    // Step 2: Property
    properties: [],
    
    // Step 5: Borrower
    borrowers: [],
    
    // Additional fields
    assets: [],
    reoProperties: [],
    declarations: {},
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createDealMutation = useMutation({
    mutationFn: async () => {
      if (!user?.org_id) throw new Error('Organization not found');

      const response = await base44.functions.invoke('createOrUpdateDeal', {
        org_id: user.org_id,
        loan_product: formData.loanType,
        loan_purpose: formData.loanPurpose,
        is_blanket: formData.isBlanket,
        loan_amount: parseFloat(formData.loanAmount),
        purchase_price: parseFloat(formData.purchasePrice) || null,
        interest_rate: parseFloat(formData.interestRate),
        loan_term_months: parseInt(formData.loanTermMonths),
        amortization_type: formData.rateType === 'Interest Only' ? 'io' : 'fixed',
        assigned_to_user_id: user.email,
        borrowers: formData.borrowers,
        properties: formData.properties,
        meta_json: {
          application_data: formData
        }
      });

      return response.data?.deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (deal?.id) {
        navigate(createPageUrl(`DealDetail?id=${deal.id}`));
      }
    },
  });

  const handleNext = () => {
    if (step === 8) {
      createDealMutation.mutate();
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigate(-1);
    }
  };

  const handleChange = (updates) => {
    setFormData({ ...formData, ...updates });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="text-white hover:bg-slate-800"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="font-bold text-sm">LG</span>
            </div>
            <span className="font-bold text-lg">LoanGenius</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 font-medium">Step {step} of 8</p>
        </div>

        {/* Steps */}
        {step === 1 && (
          <Step1Borrower
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 2 && (
          <Step2LoanType
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 3 && (
          <Step3Property
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
            isBlanket={formData.isBlanket}
          />
        )}
        {step === 4 && (
          <Step4Valuation
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
            loanPurpose={formData.loanPurpose}
          />
        )}
        {step === 5 && (
          <Step5Expenses
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 6 && (
          <Step6Review
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 7 && (
          <Step7Assets
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 8 && (
          <Step8Declarations
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
            loading={createDealMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}