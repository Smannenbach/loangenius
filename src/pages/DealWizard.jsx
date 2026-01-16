import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import Step1LoanType from '@/components/deal-wizard/Step1LoanType';
import Step2Property from '@/components/deal-wizard/Step2Property';
import Step3Valuation from '@/components/deal-wizard/Step3Valuation';
import Step4Expenses from '@/components/deal-wizard/Step4Expenses';
import Step5Borrower from '@/components/deal-wizard/Step5Borrower';
import Step6Review from '@/components/deal-wizard/Step6Review';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

export default function DealWizard() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  const isEditMode = !!dealId;
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    loanType: 'DSCR',
    occupancyType: 'Investment',
    downPaymentPercent: 25,
    loanTermMonths: 360,
    isBlanket: false,
  });

  // Fetch existing deal data if editing
  const { data: existingDeal, isLoading: dealLoading } = useQuery({
    queryKey: ['deal-edit', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const deals = await base44.entities.Deal.list();
      return deals.find(d => d.id === dealId);
    },
    enabled: !!dealId,
  });

  const { data: existingProperties = [] } = useQuery({
    queryKey: ['deal-properties-edit', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        const dealProps = await base44.entities.DealProperty.filter({ deal_id: dealId });
        const propertyIds = dealProps.map(dp => dp.property_id);
        if (!propertyIds.length) return [];
        return await base44.entities.Property.filter({ id: { $in: propertyIds } });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const { data: existingBorrowers = [] } = useQuery({
    queryKey: ['deal-borrowers-edit', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        const dealBorrs = await base44.entities.DealBorrower.filter({ deal_id: dealId });
        const borrowerIds = dealBorrs.map(db => db.borrower_id);
        if (!borrowerIds.length) return [];
        return await base44.entities.Borrower.filter({ id: { $in: borrowerIds } });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  // Load existing data into form when editing
  useEffect(() => {
    if (existingDeal && isEditMode) {
      setFormData(prev => ({
        ...prev,
        loanType: existingDeal.loan_product || 'DSCR',
        loanPurpose: existingDeal.loan_purpose || 'Purchase',
        loanAmount: existingDeal.loan_amount || '',
        interestRate: existingDeal.interest_rate || '',
        loanTermMonths: existingDeal.loan_term_months || 360,
        isBlanket: existingDeal.is_blanket || false,
        occupancyType: existingDeal.occupancy_type || 'Investment',
        amortizationType: existingDeal.amortization_type || 'fixed',
        purchasePrice: existingDeal.purchase_price || '',
        appraisedValue: existingDeal.appraised_value || '',
        properties: existingProperties.map(p => ({
          id: p.id,
          address_street: p.address_street,
          address_city: p.address_city,
          address_state: p.address_state,
          address_zip: p.address_zip,
          property_type: p.property_type,
          gross_rent_monthly: p.gross_rent_monthly,
          taxes_monthly: p.taxes_monthly,
          insurance_monthly: p.insurance_monthly,
          hoa_monthly: p.hoa_monthly,
        })),
        borrowers: existingBorrowers.map(b => ({
          id: b.id,
          first_name: b.first_name,
          last_name: b.last_name,
          email: b.email,
          phone: b.cell_phone,
        })),
      }));
    }
  }, [existingDeal, existingProperties, existingBorrowers, isEditMode]);

  const handleNext = async () => {
    if (step === 6) {
      setLoading(true);
      try {
        if (isEditMode && dealId) {
          // Update existing deal
          await base44.entities.Deal.update(dealId, {
            loan_product: formData.loanType,
            loan_purpose: formData.loanPurpose,
            is_blanket: formData.isBlanket,
            loan_amount: parseFloat(formData.loanAmount) || 0,
            interest_rate: parseFloat(formData.interestRate) || 0,
            loan_term_months: parseInt(formData.loanTermMonths) || 360,
            amortization_type: formData.amortizationType || 'fixed',
            purchase_price: parseFloat(formData.purchasePrice) || null,
            appraised_value: parseFloat(formData.appraisedValue) || null,
          });
          
          toast.success('Deal updated successfully!');
          navigate(createPageUrl(`DealDetail?id=${dealId}`));
        } else {
          // Create new deal via backend function
          const response = await base44.functions.invoke('createOrUpdateDeal', {
            action: 'create',
            dealData: {
              loan_product: formData.loanType,
              loan_purpose: formData.loanPurpose,
              is_blanket: formData.isBlanket,
              loan_amount: formData.loanAmount,
              interest_rate: formData.interestRate,
              loan_term_months: formData.loanTermMonths,
              amortization_type: formData.amortizationType || 'fixed',
              properties: formData.properties || [],
              borrowers: formData.borrowers || [],
            },
          });

          if (response.data?.deal?.id) {
            toast.success('Deal created successfully!');
            navigate(createPageUrl(`DealDetail?id=${response.data.deal.id}`));
          } else {
            toast.error('Error creating deal. Please try again.');
          }
        }
      } catch (error) {
        console.error('Error saving deal:', error);
        toast.error(error.message || 'Error saving deal. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleChange = (updates) => {
    setFormData({ ...formData, ...updates });
  };

  if (isEditMode && dealLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 lg:p-12 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading deal data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Deal' : 'New Deal'}
          </h1>
          {isEditMode && existingDeal?.deal_number && (
            <p className="text-gray-600 mt-1">Editing: {existingDeal.deal_number}</p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  s <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600">Step {step} of 6</p>
        </div>

        {/* Steps */}
        {step === 1 && (
          <Step1LoanType
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 2 && (
          <Step2Property
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
            isBlanket={formData.isBlanket}
          />
        )}
        {step === 3 && (
          <Step3Valuation
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
            loanPurpose={formData.loanPurpose}
          />
        )}
        {step === 4 && (
          <Step4Expenses
            data={formData}
            onChange={handleChange}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
        {step === 5 && (
          <Step5Borrower
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
            loading={loading}
            isEditMode={isEditMode}
          />
        )}
      </div>
    </div>
  );
}