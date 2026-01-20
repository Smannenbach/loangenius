import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  FileText,
  Home,
  Users,
  Wallet,
  Building2,
  ClipboardList,
  UserCheck,
  PenTool,
  Briefcase,
  Loader2,
} from 'lucide-react';

// Step Components
import BPAStep1LoanInfo from '@/components/bpa-wizard/BPAStep1LoanInfo.jsx';
import BPAStep2PropertyInfo from '@/components/bpa-wizard/BPAStep2PropertyInfo.jsx';
import BPAStep3Assets from '@/components/bpa-wizard/BPAStep3Assets.jsx';
import BPAStep4REO from '@/components/bpa-wizard/BPAStep4REO.jsx';
import BPAStep5Applicant from '@/components/bpa-wizard/BPAStep5Applicant.jsx';
import BPAStep6Declarations from '@/components/bpa-wizard/BPAStep6Declarations.jsx';
import BPAStep7Demographics from '@/components/bpa-wizard/BPAStep7Demographics.jsx';
import BPAStep8Acknowledgement from '@/components/bpa-wizard/BPAStep8Acknowledgement.jsx';
import BPAStep9Originator from '@/components/bpa-wizard/BPAStep9Originator.jsx';

const STEPS = [
  { id: 1, title: 'Loan Information', icon: FileText, description: 'Financing request details' },
  { id: 2, title: 'Property', icon: Home, description: 'Subject property & purpose' },
  { id: 3, title: 'Assets', icon: Wallet, description: 'Bank accounts' },
  { id: 4, title: 'REO Schedule', icon: Building2, description: 'Real estate owned' },
  { id: 5, title: 'Applicant', icon: Users, description: 'Borrower information' },
  { id: 6, title: 'Declarations', icon: ClipboardList, description: 'Required disclosures' },
  { id: 7, title: 'Demographics', icon: UserCheck, description: 'HMDA information' },
  { id: 8, title: 'Acknowledgement', icon: PenTool, description: 'Review & sign' },
  { id: 9, title: 'Originator', icon: Briefcase, description: 'Loan officer info' },
];

export default function BusinessPurposeApplication() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('deal_id');
  const isPortal = urlParams.get('portal') === 'true';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Loan Info
    loan_purpose: '',
    occupancy_type: 'Investment',
    property_type: '',
    other_property_type_text: '',
    interest_rate: '',
    amortization_type: 'fixed',
    is_interest_only: false,
    interest_only_period_months: '',
    is_arm: false,
    arm_index: '',
    arm_margin: '',
    arm_caps: '',
    is_bridge: false,
    bridge_exit_strategy: '',
    loan_amount: '',
    appraised_value: '',
    purchase_price: '',
    
    // Step 2 - Property
    property_address_street: '',
    property_address_unit: '',
    property_address_city: '',
    property_address_state: '',
    property_address_zip: '',
    property_county: '',
    location_type: '',
    number_of_units: 1,
    month_year_acquired: '',
    original_cost: '',
    existing_liens_balance: '',
    improvements_cost: '',
    improvements_month_year: '',
    vesting_type: '',
    entity_type: '',
    business_owners_20pct_count: 0,
    entity_owners: [],
    
    // Step 3 - Assets
    assets: [],
    
    // Step 4 - REO
    reo_properties: [],
    
    // Step 5 - Applicant (primary)
    applicant: {
      first_name: '',
      middle_name: '',
      last_name: '',
      suffix: '',
      ssn: '',
      taxpayer_id_type: 'SSN',
      home_phone: '',
      dob: '',
      marital_status: '',
      citizenship_status: '',
      current_address_street: '',
      current_address_unit: '',
      current_address_city: '',
      current_address_state: '',
      current_address_zip: '',
      time_at_address_years: '',
      time_at_address_months: '',
      housing_status: '',
      former_address_street: '',
      former_address_city: '',
      former_address_state: '',
      former_address_zip: '',
      former_address_na: false,
      mailing_same_as_current: true,
      mailing_address_street: '',
      mailing_address_city: '',
      mailing_address_state: '',
      mailing_address_zip: '',
      dependents_count: 0,
      dependents_ages: '',
    },
    co_applicant: null,
    
    // Step 6 - Declarations
    declarations: {
      family_relationship_with_seller: null,
      borrowing_undisclosed_money: null,
      undisclosed_money_amount: '',
      property_subject_to_priority_lien: null,
      outstanding_judgments: null,
      party_to_lawsuit: null,
      conveyed_title_in_lieu_4yr: null,
      short_sale_4yr: null,
      foreclosed_4yr: null,
      bankruptcy_4yr: null,
      bankruptcy_type: '',
      bankruptcy_date: '',
      ownership_interest_3yr: null,
      non_affiliate_occupy_14_days: null,
    },
    co_applicant_declarations: null,
    
    // Step 7 - Demographics
    demographics: {
      ethnicity: [],
      ethnicity_hispanic_origin: [],
      ethnicity_hispanic_other_text: '',
      race: [],
      race_asian_origin: [],
      race_asian_other_text: '',
      race_pacific_origin: [],
      race_pacific_other_text: '',
      race_native_tribe: '',
      sex: '',
      ethnicity_collected_visual: false,
      sex_collected_visual: false,
      race_collected_visual: false,
      demographics_collection_method: '',
    },
    co_applicant_demographics: null,
    
    // Step 8 - Signatures
    acknowledgement_agreed: false,
    applicant_signature: '',
    applicant_signature_date: '',
    co_applicant_signature: '',
    co_applicant_signature_date: '',
    
    // Step 9 - Originator
    originator: {
      organization_name: '',
      organization_address: '',
      organization_nmls_id: '',
      originator_name: '',
      originator_nmls_id: '',
      originator_state_license_id: '',
      originator_email: '',
      originator_phone: '',
      originator_address: '',
      originator_signature: '',
      originator_signature_date: '',
    },
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id;

  // Load existing deal data if editing
  const { data: existingDeal } = useQuery({
    queryKey: ['bpa-deal', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const deals = await base44.entities.Deal.filter({ id: dealId });
      return deals[0];
    },
    enabled: !!dealId,
  });

  useEffect(() => {
    if (existingDeal?.wizard_data_json) {
      setFormData(prev => ({ ...prev, ...existingDeal.wizard_data_json }));
      setCurrentStep(existingDeal.wizard_current_step || 1);
    }
  }, [existingDeal]);

  // Autosave draft every 30 seconds
  const autosaveMutation = useMutation({
    mutationFn: async (data) => {
      if (!orgId) return;
      
      const dealData = {
        org_id: orgId,
        loan_product: 'DSCR',
        loan_purpose: data.loan_purpose || 'Purchase',
        wizard_data_json: data,
        wizard_current_step: currentStep,
        last_autosave_at: new Date().toISOString(),
        status: 'draft',
      };

      if (dealId) {
        return base44.entities.Deal.update(dealId, dealData);
      } else {
        const newDeal = await base44.entities.Deal.create(dealData);
        // Update URL with new deal ID
        window.history.replaceState(null, '', `?deal_id=${newDeal.id}`);
        return newDeal;
      }
    },
  });

  // FIX: Track previous form data to avoid unnecessary autosaves
  const previousFormDataRef = React.useRef(null);
  
  // Autosave effect - only save if data actually changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (orgId && (formData.loan_purpose || formData.applicant.first_name)) {
        // Only save if form data has changed
        const currentData = JSON.stringify(formData);
        if (currentData !== previousFormDataRef.current) {
          autosaveMutation.mutate(formData);
          previousFormDataRef.current = currentData;
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, orgId]);

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const calculateLTV = () => {
    const amount = parseFloat(formData.loan_amount) || 0;
    const value = formData.loan_purpose === 'Purchase' 
      ? parseFloat(formData.purchase_price) || 0
      : parseFloat(formData.appraised_value) || 0;
    
    if (value > 0) {
      return ((amount / value) * 100).toFixed(2);
    }
    return 'Pending';
  };

  const validateStep = (step) => {
    const errors = {};
    
    switch (step) {
      case 1:
        if (!formData.loan_purpose) errors.loan_purpose = 'Required';
        if (!formData.property_type) errors.property_type = 'Required';
        if (!formData.loan_amount || parseFloat(formData.loan_amount) <= 0) {
          errors.loan_amount = 'Valid loan amount required';
        }
        if (formData.loan_purpose === 'Purchase' && !formData.purchase_price) {
          errors.purchase_price = 'Required for purchase';
        }
        if (formData.property_type === 'Other' && !formData.other_property_type_text) {
          errors.other_property_type_text = 'Please specify property type';
        }
        break;
      case 2:
        if (!formData.property_address_street) errors.property_address_street = 'Required';
        if (!formData.property_address_city) errors.property_address_city = 'Required';
        if (!formData.property_address_state) errors.property_address_state = 'Required';
        if (!formData.property_address_zip) errors.property_address_zip = 'Required';
        if (!formData.vesting_type) errors.vesting_type = 'Required';
        break;
      case 5:
        if (!formData.applicant.first_name) errors['applicant.first_name'] = 'Required';
        if (!formData.applicant.last_name) errors['applicant.last_name'] = 'Required';
        if (!formData.applicant.citizenship_status) errors['applicant.citizenship_status'] = 'Required';
        break;
      case 8:
        if (!formData.acknowledgement_agreed) errors.acknowledgement_agreed = 'Must agree to continue';
        if (!formData.applicant_signature) errors.applicant_signature = 'Signature required';
        break;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    // Validate only on final submit, not on navigation
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
      autosaveMutation.mutate(formData);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNumber) => {
    setCurrentStep(stepNumber);
    autosaveMutation.mutate(formData);
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    await autosaveMutation.mutateAsync(formData);
    toast.success('Draft saved successfully');
    setIsSaving(false);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Organization not found');
      
      // Create/update deal
      const dealData = {
        org_id: orgId,
        loan_product: 'DSCR',
        loan_purpose: formData.loan_purpose,
        occupancy_type: formData.occupancy_type,
        property_type: formData.property_type,
        other_property_type_text: formData.other_property_type_text,
        loan_amount: parseFloat(formData.loan_amount) || 0,
        interest_rate: parseFloat(formData.interest_rate) || null,
        amortization_type: formData.amortization_type,
        is_interest_only: formData.is_interest_only,
        interest_only_period_months: parseInt(formData.interest_only_period_months) || null,
        is_arm: formData.is_arm,
        is_bridge: formData.is_bridge,
        bridge_exit_strategy: formData.bridge_exit_strategy,
        appraised_value: parseFloat(formData.appraised_value) || null,
        purchase_price: parseFloat(formData.purchase_price) || null,
        vesting_type: formData.vesting_type,
        entity_type: formData.entity_type,
        ltv: parseFloat(calculateLTV()) || null,
        stage: 'application',
        status: 'active',
        application_date: new Date().toISOString().split('T')[0],
        application_completed_at: new Date().toISOString(),
        application_channel: isPortal ? 'borrower_portal' : 'lo_portal',
        wizard_data_json: formData,
        wizard_current_step: 9,
      };

      let deal;
      if (dealId) {
        deal = await base44.entities.Deal.update(dealId, dealData);
      } else {
        deal = await base44.entities.Deal.create(dealData);
      }

      // Create property
      const property = await base44.entities.Property.create({
        org_id: orgId,
        address_street: formData.property_address_street,
        address_unit: formData.property_address_unit,
        address_city: formData.property_address_city,
        address_state: formData.property_address_state,
        address_zip: formData.property_address_zip,
        county: formData.property_county,
        property_type: formData.property_type,
        location_type: formData.location_type,
        number_of_units: formData.number_of_units,
        month_year_acquired: formData.month_year_acquired,
        original_cost: parseFloat(formData.original_cost) || null,
        existing_liens_balance: parseFloat(formData.existing_liens_balance) || null,
        improvements_cost: parseFloat(formData.improvements_cost) || null,
        improvements_month_year: formData.improvements_month_year,
      });

      // Link property to deal
      await base44.entities.DealProperty.create({
        org_id: orgId,
        deal_id: deal.id,
        property_id: property.id,
        is_subject: true,
      });

      // Create borrower
      const borrower = await base44.entities.Borrower.create({
        org_id: orgId,
        first_name: formData.applicant.first_name,
        middle_name: formData.applicant.middle_name,
        last_name: formData.applicant.last_name,
        suffix: formData.applicant.suffix,
        home_phone: formData.applicant.home_phone,
        taxpayer_id_type: formData.applicant.taxpayer_id_type,
        ssn_last4: formData.applicant.ssn ? formData.applicant.ssn.slice(-4) : '',
        marital_status: formData.applicant.marital_status,
        citizenship_status: formData.applicant.citizenship_status,
        current_address_street: formData.applicant.current_address_street,
        current_address_city: formData.applicant.current_address_city,
        current_address_state: formData.applicant.current_address_state,
        current_address_zip: formData.applicant.current_address_zip,
        time_at_address_years: parseInt(formData.applicant.time_at_address_years) || 0,
        time_at_address_months: parseInt(formData.applicant.time_at_address_months) || 0,
        housing_status: formData.applicant.housing_status,
        mailing_same_as_current: formData.applicant.mailing_same_as_current,
        dependents_count: formData.applicant.dependents_count,
        dependents_ages: formData.applicant.dependents_ages,
      });

      // Link borrower to deal
      await base44.entities.DealBorrower.create({
        org_id: orgId,
        deal_id: deal.id,
        borrower_id: borrower.id,
        role: 'primary',
      });

      // Create assets
      for (const asset of formData.assets) {
        await base44.entities.BorrowerAsset.create({
          org_id: orgId,
          borrower_id: borrower.id,
          deal_id: deal.id,
          account_type: asset.account_type,
          account_type_other: asset.account_type_other,
          bank_name: asset.bank_name,
          account_last4: asset.account_last4,
          account_balance: parseFloat(asset.account_balance) || 0,
          funds_used_for_closing: asset.funds_used_for_closing,
        });
      }

      // Create REO properties
      for (const reo of formData.reo_properties) {
        await base44.entities.REOProperty.create({
          org_id: orgId,
          borrower_id: borrower.id,
          deal_id: deal.id,
          property_address: reo.property_address,
          property_city: reo.property_city,
          property_state: reo.property_state,
          property_zip: reo.property_zip,
          lien_holder_1: reo.lien_holder_1,
          lien_holder_2: reo.lien_holder_2,
          property_use: reo.property_use,
          property_type: reo.property_type,
          mortgage_lien_1_amount: parseFloat(reo.mortgage_lien_1_amount) || 0,
          mortgage_lien_2_amount: parseFloat(reo.mortgage_lien_2_amount) || 0,
          property_value: parseFloat(reo.property_value) || 0,
          net_equity: parseFloat(reo.net_equity) || 0,
        });
      }

      // Create declarations
      await base44.entities.BorrowerDeclaration.create({
        org_id: orgId,
        borrower_id: borrower.id,
        deal_id: deal.id,
        ...formData.declarations,
        undisclosed_money_amount: parseFloat(formData.declarations.undisclosed_money_amount) || null,
      });

      // Create demographics (only if vesting is Individual)
      if (formData.vesting_type === 'Individual') {
        await base44.entities.BorrowerDemographic.create({
          org_id: orgId,
          borrower_id: borrower.id,
          deal_id: deal.id,
          ...formData.demographics,
        });
      }

      // Create signature record
      await base44.entities.ApplicationSignature.create({
        org_id: orgId,
        deal_id: deal.id,
        borrower_id: borrower.id,
        signature_type: 'applicant',
        signature_data: formData.applicant_signature,
        signature_method: 'typed',
        signed_at: new Date().toISOString(),
      });

      return deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Application submitted successfully!');
      window.location.href = createPageUrl(`DealDetail?id=${deal.id}`);
    },
    onError: (error) => {
      toast.error('Failed to submit application: ' + error.message);
    },
  });

  const handleSubmit = () => {
    // Validate all critical fields before final submit
    const criticalErrors = {};
    if (!formData.loan_purpose) criticalErrors.loan_purpose = 'Required';
    if (!formData.loan_amount) criticalErrors.loan_amount = 'Required';
    if (!formData.property_address_street) criticalErrors.property_address = 'Required';
    if (!formData.applicant.first_name) criticalErrors.applicant_name = 'Required';
    if (!formData.acknowledgement_agreed) criticalErrors.acknowledgement = 'Required';
    
    if (Object.keys(criticalErrors).length > 0) {
      toast.error('Please complete required fields before submitting');
      setValidationErrors(criticalErrors);
      return;
    }
    
    submitMutation.mutate();
  };

  const progress = (currentStep / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BPAStep1LoanInfo formData={formData} updateFormData={updateFormData} errors={validationErrors} calculateLTV={calculateLTV} />;
      case 2:
        return <BPAStep2PropertyInfo formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 3:
        return <BPAStep3Assets formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 4:
        return <BPAStep4REO formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 5:
        return <BPAStep5Applicant formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 6:
        return <BPAStep6Declarations formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 7:
        return <BPAStep7Demographics formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 8:
        return <BPAStep8Acknowledgement formData={formData} updateFormData={updateFormData} errors={validationErrors} />;
      case 9:
        return <BPAStep9Originator formData={formData} updateFormData={updateFormData} errors={validationErrors} isPortal={isPortal} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <Link to={createPageUrl('Deals')} className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Business Purpose Application
          </h1>
          <p className="text-gray-500 mt-1">DSCR / Commercial Loan Application</p>
        </div>

        {/* Progress */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Step indicators - horizontal scroll on mobile */}
            <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = step.id === currentStep;
                const isComplete = step.id < currentStep;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : isComplete
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{step.title}</span>
                    <span className="sm:hidden">{step.id}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Current Step */}
        <Card className="mb-6">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              {React.createElement(STEPS[currentStep - 1].icon, { className: 'h-6 w-6 text-blue-600' })}
              <div>
                <CardTitle className="text-xl">{STEPS[currentStep - 1].title}</CardTitle>
                <p className="text-sm text-gray-500">{STEPS[currentStep - 1].description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
          </div>
          
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} className="gap-2 bg-blue-600 hover:bg-blue-700">
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Submit Application
            </Button>
          )}
        </div>

        {/* LTV Preview */}
        {(formData.loan_amount && (formData.purchase_price || formData.appraised_value)) && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 hidden md:block">
            <div className="text-xs text-gray-500 uppercase">Live LTV</div>
            <div className="text-2xl font-bold text-blue-600">{calculateLTV()}%</div>
          </div>
        )}
      </div>
    </div>
  );
}