import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Step1LoanType from '@/components/deal-wizard/Step1LoanType';
import Step2Property from '@/components/deal-wizard/Step2Property';
import Step3Valuation from '@/components/deal-wizard/Step3Valuation';
import Step4Expenses from '@/components/deal-wizard/Step4Expenses';
import Step5Borrower from '@/components/deal-wizard/Step5Borrower';
import Step6Review from '@/components/deal-wizard/Step6Review';

export default function DealWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    loanType: 'DSCR',
    occupancyType: 'Investment',
    downPaymentPercent: 25,
    loanTermMonths: 360,
    isBlanket: false,
  });

  const handleNext = async () => {
    if (step === 6) {
      // Create deal
      setLoading(true);
      try {
        // Generate loan number
        const now = new Date();
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const counter = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const loanNumber = `LG-${yearMonth}-${counter}`;

        // Create loan file
        const loanFile = await base44.entities.LoanFile.create({
          org_id: 'default-org', // TODO: Get from auth context
          loan_number: loanNumber,
          loan_name: formData.loanName || `${formData.loanType} Loan`,
          loan_type: formData.loanType,
          loan_purpose: formData.loanPurpose,
          occupancy_type: formData.occupancyType,
          is_blanket: formData.isBlanket,
          loan_amount: formData.loanAmount,
          purchase_price: formData.purchasePrice,
          appraised_value: formData.appraisedValue || formData.purchasePrice,
          down_payment: formData.purchasePrice ? formData.purchasePrice - formData.loanAmount : 0,
          interest_rate: formData.interestRate,
          loan_term_months: formData.loanTermMonths,
          status: 'Lead',
        });

        // Create properties
        if (formData.properties && formData.properties.length > 0) {
          for (const prop of formData.properties) {
            await base44.entities.Property.create({
              org_id: 'default-org',
              loan_file_id: loanFile.id,
              address_street: prop.street,
              address_unit: prop.unit,
              address_city: prop.city,
              address_state: prop.state,
              address_zip: prop.zip,
              property_type: prop.propertyType || 'SFR',
              unit_count: prop.unitCount || 1,
              year_built: prop.yearBuilt,
              square_feet: prop.squareFeet,
              is_subject_property: true,
            });
          }
        }

        // Create borrowers (if needed)
        // TODO: Implement borrower creation

        // Log audit
        // TODO: Implement audit logging

        navigate(`/DealDetail?id=${loanFile.id}`);
      } catch (error) {
        console.error('Error creating deal:', error);
        alert('Error creating deal. Please try again.');
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-12">
      <div className="max-w-2xl mx-auto">
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
          />
        )}
      </div>
    </div>
  );
}