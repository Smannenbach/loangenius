import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, Check, User, Building2, DollarSign, FileText, Home, Calculator, Loader2, Plus, X, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const STEPS = [
  { id: 1, title: 'Borrower', icon: User },
  { id: 2, title: 'Loan Type', icon: FileText },
  { id: 3, title: 'Property', icon: Home },
  { id: 4, title: 'Valuation', icon: DollarSign },
  { id: 5, title: 'Income', icon: Calculator },
  { id: 6, title: 'Assets', icon: Building2 },
  { id: 7, title: 'Declarations', icon: FileText },
  { id: 8, title: 'Review', icon: Check },
];

export default function LoanApplicationWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Borrower Info
    borrowers: [],
    
    // Loan Type
    loanType: 'DSCR',
    loanPurpose: 'Purchase',
    isBlanket: false,
    
    // Property
    properties: [],
    
    // Valuation
    loanAmount: '',
    purchasePrice: '',
    appraisedValue: '',
    interestRate: '7.5',
    rateType: 'Fixed',
    loanTermMonths: 360,
    prepaymentType: 'No Prepayment Penalty',
    
    // Income/Expenses
    currentLeaseRent: '',
    marketRent: '',
    annualPropertyTaxes: '',
    annualHomeInsurance: '',
    annualFloodInsurance: '',
    monthlyHOA: '',
    
    // Assets
    assets: [],
    
    // Declarations
    declarations: {},
  });

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

  const orgId = memberships[0]?.org_id || user?.org_id;

  const createDealMutation = useMutation({
    mutationFn: async () => {
      const formattedBorrowers = (formData.borrowers || []).map(b => ({
        firstName: b.first_name,
        lastName: b.last_name,
        email: b.email,
        phone: b.phone,
        role: b.party_type === 'Primary Borrower' ? 'primary' : 
              b.party_type === 'Co-Borrower' ? 'co_borrower' : 'guarantor',
      }));

      const formattedProperties = (formData.properties || []).map(p => ({
        street: p.address_street,
        unit: p.address_unit,
        city: p.address_city,
        state: p.address_state,
        zip: p.address_zip,
        propertyType: p.property_type,
        occupancyType: 'investment',
        yearBuilt: p.year_built ? parseInt(p.year_built) : null,
        squareFeet: p.sqft ? parseInt(p.sqft) : null,
        monthlyRent: parseFloat(formData.currentLeaseRent) || 0,
      }));

      const response = await base44.functions.invoke('createOrUpdateDeal', {
        action: 'create',
        dealData: {
          org_id: orgId,
          loan_product: formData.loanType,
          loan_purpose: formData.loanPurpose,
          is_blanket: formData.isBlanket,
          loan_amount: parseFloat(formData.loanAmount) || 0,
          interest_rate: parseFloat(formData.interestRate) || 0,
          loan_term_months: parseInt(formData.loanTermMonths) || 360,
          amortization_type: formData.rateType === 'Interest Only' ? 'io' : 'fixed',
          borrowers: formattedBorrowers,
          properties: formattedProperties,
        }
      });

      return response.data?.deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Loan application submitted successfully!');
      if (deal?.id) {
        navigate(createPageUrl(`DealDetail?id=${deal.id}`));
      } else {
        navigate(createPageUrl('Deals'));
      }
    },
    onError: (error) => {
      console.error('Error creating deal:', error);
      toast.error('Error creating loan application: ' + (error.message || 'Unknown error'));
    },
  });

  const handleChange = (updates) => {
    setFormData({ ...formData, ...updates });
  };

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

  // Calculate metrics
  const loanAmount = parseFloat(formData.loanAmount) || 0;
  const propertyValue = parseFloat(formData.appraisedValue || formData.purchasePrice) || 0;
  const ltv = propertyValue > 0 ? ((loanAmount / propertyValue) * 100).toFixed(1) : 0;
  
  const monthlyRate = (parseFloat(formData.interestRate) || 0) / 100 / 12;
  const termMonths = parseInt(formData.loanTermMonths) || 360;
  let monthlyPI = 0;
  if (monthlyRate > 0 && loanAmount > 0) {
    monthlyPI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  }

  const monthlyTaxes = (parseFloat(formData.annualPropertyTaxes) || 0) / 12;
  const monthlyInsurance = (parseFloat(formData.annualHomeInsurance) || 0) / 12;
  const monthlyFlood = (parseFloat(formData.annualFloodInsurance) || 0) / 12;
  const monthlyHOA = parseFloat(formData.monthlyHOA) || 0;
  const totalPITIA = monthlyPI + monthlyTaxes + monthlyInsurance + monthlyFlood + monthlyHOA;

  const monthlyRent = parseFloat(formData.currentLeaseRent) || parseFloat(formData.marketRent) || 0;
  const dscr = totalPITIA > 0 ? (monthlyRent / totalPITIA).toFixed(3) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
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
            <span className="font-bold text-lg">New Loan Application</span>
          </div>
        </div>
        <div className="text-sm text-slate-400">
          Step {step} of {STEPS.length}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex flex-col items-center ${idx > 0 ? 'ml-4' : ''}`}>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    step === s.id ? 'bg-blue-600 text-white' :
                    step > s.id ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s.id ? <Check className="h-5 w-5" /> : s.id}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${step === s.id ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 sm:w-12 ml-4 ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step 1: Borrower */}
        {step === 1 && <BorrowerStep data={formData} onChange={handleChange} />}
        
        {/* Step 2: Loan Type */}
        {step === 2 && <LoanTypeStep data={formData} onChange={handleChange} />}
        
        {/* Step 3: Property */}
        {step === 3 && <PropertyStep data={formData} onChange={handleChange} />}
        
        {/* Step 4: Valuation */}
        {step === 4 && <ValuationStep data={formData} onChange={handleChange} ltv={ltv} />}
        
        {/* Step 5: Income/Expenses */}
        {step === 5 && <IncomeStep data={formData} onChange={handleChange} dscr={dscr} monthlyPI={monthlyPI} totalPITIA={totalPITIA} />}
        
        {/* Step 6: Assets */}
        {step === 6 && <AssetsStep data={formData} onChange={handleChange} />}
        
        {/* Step 7: Declarations */}
        {step === 7 && <DeclarationsStep data={formData} onChange={handleChange} />}
        
        {/* Step 8: Review */}
        {step === 8 && <ReviewStep data={formData} ltv={ltv} dscr={dscr} monthlyPI={monthlyPI} totalPITIA={totalPITIA} />}

        {/* Navigation */}
        <div className="flex justify-between pt-8 border-t mt-8">
          <Button variant="outline" onClick={handlePrev} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Previous'}
          </Button>
          <Button 
            onClick={handleNext}
            disabled={createDealMutation.isPending}
            className={`gap-2 ${step === 8 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {createDealMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : step === 8 ? (
              <>
                <Check className="h-4 w-4" />
                Submit Application
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step Components
function BorrowerStep({ data, onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [currentBorrower, setCurrentBorrower] = useState({
    first_name: '', last_name: '', email: '', phone: '', party_type: 'Primary Borrower',
    ssn_last_4: '', dob: '', citizenship: 'US Citizen', credit_score: '',
  });

  const handleAdd = () => {
    if (!currentBorrower.first_name || !currentBorrower.last_name) {
      toast.error('First and last name are required');
      return;
    }
    onChange({ borrowers: [...(data.borrowers || []), { ...currentBorrower, id: Date.now() }] });
    setCurrentBorrower({ first_name: '', last_name: '', email: '', phone: '', party_type: 'Primary Borrower', ssn_last_4: '', dob: '', citizenship: 'US Citizen', credit_score: '' });
    setShowForm(false);
    toast.success('Borrower added');
  };

  const handleRemove = (idx) => {
    onChange({ borrowers: data.borrowers.filter((_, i) => i !== idx) });
    toast.success('Borrower removed');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Borrower Information</h2>
        <p className="text-gray-600 mt-1">Add all borrowers and guarantors for this loan</p>
      </div>

      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Borrower
        </Button>
      ) : (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={currentBorrower.first_name} onChange={(e) => setCurrentBorrower({ ...currentBorrower, first_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={currentBorrower.last_name} onChange={(e) => setCurrentBorrower({ ...currentBorrower, last_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={currentBorrower.email} onChange={(e) => setCurrentBorrower({ ...currentBorrower, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={currentBorrower.phone} onChange={(e) => setCurrentBorrower({ ...currentBorrower, phone: e.target.value })} placeholder="(555) 555-5555" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={currentBorrower.party_type} onValueChange={(v) => setCurrentBorrower({ ...currentBorrower, party_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary Borrower">Primary Borrower</SelectItem>
                    <SelectItem value="Co-Borrower">Co-Borrower</SelectItem>
                    <SelectItem value="Guarantor">Guarantor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credit Score (Est.)</Label>
                <Input type="number" value={currentBorrower.credit_score} onChange={(e) => setCurrentBorrower({ ...currentBorrower, credit_score: e.target.value })} placeholder="720" />
              </div>
              <div className="space-y-2">
                <Label>Citizenship</Label>
                <Select value={currentBorrower.citizenship} onValueChange={(v) => setCurrentBorrower({ ...currentBorrower, citizenship: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US Citizen">US Citizen</SelectItem>
                    <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                    <SelectItem value="Foreign National">Foreign National</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={currentBorrower.dob} onChange={(e) => setCurrentBorrower({ ...currentBorrower, dob: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">Add Borrower</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {data.borrowers?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Added Borrowers ({data.borrowers.length})</h3>
          {data.borrowers.map((b, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-white border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{b.first_name} {b.last_name}</p>
                  <p className="text-sm text-gray-500">{b.party_type} • {b.email || 'No email'}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(idx)} className="text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {data.borrowers?.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 italic">No borrowers added yet. You can add them now or later.</p>
      )}
    </div>
  );
}

function LoanTypeStep({ data, onChange }) {
  const loanTypes = [
    { value: 'DSCR', label: 'DSCR', description: 'Debt Service Coverage Ratio - qualify based on property cash flow' },
    { value: 'DSCR - No Ratio', label: 'DSCR No-Ratio', description: 'Flexible qualification without ratio requirements' },
    { value: 'DSCR Blanket', label: 'DSCR Blanket', description: 'Multi-property portfolio loan' },
    { value: 'Hard Money', label: 'Hard Money', description: 'Short-term asset-based lending' },
    { value: 'Bridge', label: 'Bridge', description: 'Short-term financing between transactions' },
  ];

  const purposes = [
    { value: 'Purchase', label: 'Purchase' },
    { value: 'Rate & Term Refinance', label: 'Rate & Term Refinance' },
    { value: 'Cash-Out Refinance', label: 'Cash-Out Refinance' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Loan Type & Purpose</h2>
        <p className="text-gray-600 mt-1">Select the type of loan and its purpose</p>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">Loan Product</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loanTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onChange({ loanType: type.value, isBlanket: type.value === 'DSCR Blanket' })}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                data.loanType === type.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{type.label}</div>
              <div className="text-sm text-gray-500 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-semibold">Loan Purpose</Label>
        <div className="grid grid-cols-3 gap-3">
          {purposes.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ loanPurpose: p.value })}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                data.loanPurpose === p.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <Checkbox
          id="blanket"
          checked={data.isBlanket}
          onCheckedChange={(checked) => onChange({ isBlanket: checked, loanType: checked ? 'DSCR Blanket' : data.loanType === 'DSCR Blanket' ? 'DSCR' : data.loanType })}
        />
        <label htmlFor="blanket" className="text-sm cursor-pointer">
          This is a blanket/portfolio loan (multiple properties as collateral)
        </label>
      </div>
    </div>
  );
}

function PropertyStep({ data, onChange }) {
  const [current, setCurrent] = useState({
    address_street: '', address_unit: '', address_city: '', address_state: '', address_zip: '',
    property_type: '', year_built: '', sqft: '', units: '1',
  });

  const propertyTypes = ['SFR', 'PUD', 'Condo', '2-4 Units', '5+ Units', 'Mixed Use', 'Townhouse'];

  const handleAdd = () => {
    if (!current.address_street || !current.property_type) {
      toast.error('Address and property type are required');
      return;
    }
    onChange({ properties: [...(data.properties || []), { ...current, id: Date.now() }] });
    setCurrent({ address_street: '', address_unit: '', address_city: '', address_state: '', address_zip: '', property_type: '', year_built: '', sqft: '', units: '1' });
    toast.success('Property added');
  };

  const handleRemove = (idx) => {
    onChange({ properties: data.properties.filter((_, i) => i !== idx) });
    toast.success('Property removed');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Property Information</h2>
        <p className="text-gray-600 mt-1">Add the subject property details</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label>Street Address *</Label>
              <AddressAutocomplete 
                value={current.address_street}
                onChange={(val) => setCurrent({ ...current, address_street: val })}
                onAddressParsed={(parsed) => {
                  setCurrent({ 
                    ...current, 
                    address_street: parsed.street,
                    address_city: parsed.city,
                    address_state: parsed.state,
                    address_zip: parsed.zip,
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit/Apt</Label>
              <Input value={current.address_unit} onChange={(e) => setCurrent({ ...current, address_unit: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City *</Label>
              <Input value={current.address_city} onChange={(e) => setCurrent({ ...current, address_city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>State *</Label>
              <Input value={current.address_state} onChange={(e) => setCurrent({ ...current, address_state: e.target.value })} placeholder="CA" />
            </div>
            <div className="space-y-2">
              <Label>ZIP *</Label>
              <Input value={current.address_zip} onChange={(e) => setCurrent({ ...current, address_zip: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select value={current.property_type} onValueChange={(v) => setCurrent({ ...current, property_type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year Built</Label>
              <Input type="number" value={current.year_built} onChange={(e) => setCurrent({ ...current, year_built: e.target.value })} placeholder="1990" />
            </div>
            <div className="space-y-2">
              <Label>Square Feet</Label>
              <Input type="number" value={current.sqft} onChange={(e) => setCurrent({ ...current, sqft: e.target.value })} placeholder="2000" />
            </div>
            <div className="space-y-2">
              <Label># of Units</Label>
              <Input type="number" value={current.units} onChange={(e) => setCurrent({ ...current, units: e.target.value })} />
            </div>
          </div>

          <Button onClick={handleAdd} disabled={!current.address_street || !current.property_type} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 gap-2">
            <Plus className="h-4 w-4" />
            {data.properties?.length > 0 ? 'Add Another Property' : 'Add Property'}
          </Button>
        </CardContent>
      </Card>

      {data.properties?.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Added Properties ({data.properties.length})</h3>
          {data.properties.map((p, idx) => (
            <div key={idx} className="flex items-start justify-between p-4 bg-white border rounded-lg">
              <div className="flex gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{p.address_street}</p>
                  <p className="text-sm text-gray-500">{p.address_city}, {p.address_state} {p.address_zip}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.property_type} • {p.sqft ? `${p.sqft} sq ft` : 'Size TBD'}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemove(idx)} className="text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ValuationStep({ data, onChange, ltv }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Valuation & Loan Terms</h2>
        <p className="text-gray-600 mt-1">Set property value and loan parameters</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Loan Amount *</Label>
              <Input type="number" value={data.loanAmount} onChange={(e) => onChange({ loanAmount: e.target.value })} placeholder="375000" />
            </div>
            {data.loanPurpose === 'Purchase' ? (
              <div className="space-y-2">
                <Label>Purchase Price</Label>
                <Input type="number" value={data.purchasePrice} onChange={(e) => onChange({ purchasePrice: e.target.value })} placeholder="500000" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Appraised Value</Label>
                <Input type="number" value={data.appraisedValue} onChange={(e) => onChange({ appraisedValue: e.target.value })} placeholder="500000" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Interest Rate (%) *</Label>
              <Input type="number" step="0.125" value={data.interestRate} onChange={(e) => onChange({ interestRate: e.target.value })} placeholder="7.5" />
            </div>
            <div className="space-y-2">
              <Label>Rate Type</Label>
              <Select value={data.rateType} onValueChange={(v) => onChange({ rateType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="ARM">ARM</SelectItem>
                  <SelectItem value="Interest Only">Interest Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Loan Term</Label>
              <Select value={data.loanTermMonths?.toString()} onValueChange={(v) => onChange({ loanTermMonths: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="360">30 Years</SelectItem>
                  <SelectItem value="180">15 Years</SelectItem>
                  <SelectItem value="120">10 Years</SelectItem>
                  <SelectItem value="60">5 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prepayment Penalty</Label>
              <Select value={data.prepaymentType} onValueChange={(v) => onChange({ prepaymentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="No Prepayment Penalty">No Prepayment Penalty</SelectItem>
                  <SelectItem value="5-4-3-2-1">5-4-3-2-1</SelectItem>
                  <SelectItem value="3-2-1">3-2-1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* LTV Display */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-700">Loan-to-Value (LTV)</span>
              <span className={`text-2xl font-bold ${parseFloat(ltv) <= 75 ? 'text-green-600' : parseFloat(ltv) <= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {ltv}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IncomeStep({ data, onChange, dscr, monthlyPI, totalPITIA }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Rental Income & Expenses</h2>
        <p className="text-gray-600 mt-1">Enter property income and monthly obligations</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Current Lease Rent ($/month) *</Label>
              <Input type="number" value={data.currentLeaseRent} onChange={(e) => onChange({ currentLeaseRent: e.target.value })} placeholder="3000" />
            </div>
            <div className="space-y-2">
              <Label>Market Rent ($/month)</Label>
              <Input type="number" value={data.marketRent} onChange={(e) => onChange({ marketRent: e.target.value })} placeholder="3200" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Annual Property Taxes *</Label>
              <Input type="number" value={data.annualPropertyTaxes} onChange={(e) => onChange({ annualPropertyTaxes: e.target.value })} placeholder="6000" />
            </div>
            <div className="space-y-2">
              <Label>Annual Homeowners Insurance *</Label>
              <Input type="number" value={data.annualHomeInsurance} onChange={(e) => onChange({ annualHomeInsurance: e.target.value })} placeholder="2400" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Annual Flood Insurance</Label>
              <Input type="number" value={data.annualFloodInsurance} onChange={(e) => onChange({ annualFloodInsurance: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Monthly HOA Dues</Label>
              <Input type="number" value={data.monthlyHOA} onChange={(e) => onChange({ monthlyHOA: e.target.value })} placeholder="0" />
            </div>
          </div>

          {/* DSCR Calculation Display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-center">
              <p className="text-sm text-gray-600">Monthly P&I</p>
              <p className="text-xl font-bold text-gray-900">${monthlyPI.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total PITIA</p>
              <p className="text-xl font-bold text-gray-900">${totalPITIA.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">DSCR Ratio</p>
              <p className={`text-2xl font-bold ${parseFloat(dscr) >= 1.25 ? 'text-green-600' : parseFloat(dscr) >= 1.0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {dscr}
              </p>
              <p className="text-xs text-gray-500">
                {parseFloat(dscr) >= 1.25 ? 'Excellent' : parseFloat(dscr) >= 1.0 ? 'Acceptable' : 'Below threshold'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsStep({ data, onChange }) {
  const [current, setCurrent] = useState({ account_type: 'checking', bank_name: '', balance: '' });

  const addAsset = () => {
    if (!current.balance) {
      toast.error('Balance is required');
      return;
    }
    onChange({ assets: [...(data.assets || []), { ...current, id: Date.now() }] });
    setCurrent({ account_type: 'checking', bank_name: '', balance: '' });
    toast.success('Asset added');
  };

  const removeAsset = (idx) => {
    onChange({ assets: data.assets.filter((_, i) => i !== idx) });
  };

  const totalAssets = (data.assets || []).reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Assets & Reserves</h2>
        <p className="text-gray-600 mt-1">List financial accounts to verify reserves</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={current.account_type} onValueChange={(v) => setCurrent({ ...current, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="stocks">Stocks & Bonds</SelectItem>
                  <SelectItem value="retirement">IRA/401K</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bank/Institution</Label>
              <Input value={current.bank_name} onChange={(e) => setCurrent({ ...current, bank_name: e.target.value })} placeholder="Bank of America" />
            </div>
            <div className="space-y-2">
              <Label>Balance *</Label>
              <Input type="number" value={current.balance} onChange={(e) => setCurrent({ ...current, balance: e.target.value })} placeholder="50000" />
            </div>
          </div>
          <Button onClick={addAsset} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </CardContent>
      </Card>

      {data.assets?.length > 0 && (
        <div className="space-y-3">
          {data.assets.map((a, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-white border rounded-lg">
              <div>
                <p className="font-medium capitalize">{a.account_type.replace('_', ' ')}</p>
                <p className="text-sm text-gray-500">{a.bank_name || 'N/A'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-green-600">${parseFloat(a.balance).toLocaleString()}</span>
                <Button variant="ghost" size="sm" onClick={() => removeAsset(idx)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Liquid Assets</span>
              <span className="text-xl font-bold text-blue-600">${totalAssets.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeclarationsStep({ data, onChange }) {
  const declarations = [
    { id: 'family_relationship', label: 'Do you have any family relationship with the seller?' },
    { id: 'borrowing_money', label: 'Are you borrowing money for down payment or closing costs?' },
    { id: 'outstanding_judgments', label: 'Are there any outstanding judgments against you?' },
    { id: 'party_lawsuit', label: 'Are you a party to a lawsuit?' },
    { id: 'foreclosure', label: 'Have you had a foreclosure in the past 4 years?' },
    { id: 'bankruptcy', label: 'Have you declared bankruptcy in the past 4 years?' },
    { id: 'occupy_property', label: 'Will you or family occupy the property more than 14 days/year?' },
  ];

  const handleChange = (id, value) => {
    onChange({ declarations: { ...(data.declarations || {}), [id]: value } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Declarations</h2>
        <p className="text-gray-600 mt-1">Answer the following questions truthfully</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {declarations.map((d) => (
            <div key={d.id} className="space-y-3 pb-4 border-b last:border-b-0">
              <Label>{d.label}</Label>
              <RadioGroup
                value={data.declarations?.[d.id] || ''}
                onValueChange={(v) => handleChange(d.id, v)}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id={`${d.id}_yes`} />
                  <label htmlFor={`${d.id}_yes`} className="font-medium">Yes</label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id={`${d.id}_no`} />
                  <label htmlFor={`${d.id}_no`} className="font-medium">No</label>
                </div>
              </RadioGroup>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({ data, ltv, dscr, monthlyPI, totalPITIA }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>
        <p className="text-gray-600 mt-1">Review your application before submitting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Loan Details */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Loan Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Loan Type:</span><span className="font-medium">{data.loanType}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Purpose:</span><span className="font-medium">{data.loanPurpose}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Loan Amount:</span><span className="font-medium">${parseFloat(data.loanAmount || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Interest Rate:</span><span className="font-medium">{data.interestRate}%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Term:</span><span className="font-medium">{data.loanTermMonths / 12} years</span></div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader><CardTitle className="text-lg">Key Metrics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">LTV</span>
              <span className={`text-xl font-bold ${parseFloat(ltv) <= 75 ? 'text-green-600' : 'text-yellow-600'}`}>{ltv}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">DSCR</span>
              <span className={`text-xl font-bold ${parseFloat(dscr) >= 1.25 ? 'text-green-600' : 'text-yellow-600'}`}>{dscr}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monthly P&I</span>
              <span className="font-medium">${monthlyPI.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total PITIA</span>
              <span className="font-medium">${totalPITIA.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Borrowers */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Borrowers ({data.borrowers?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {data.borrowers?.length > 0 ? (
            <div className="space-y-2">
              {data.borrowers.map((b, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{b.first_name} {b.last_name}</p>
                  <p className="text-sm text-gray-500">{b.party_type} • {b.email || 'No email'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No borrowers added</p>
          )}
        </CardContent>
      </Card>

      {/* Properties */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Properties ({data.properties?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          {data.properties?.length > 0 ? (
            <div className="space-y-2">
              {data.properties.map((p, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{p.address_street}</p>
                  <p className="text-sm text-gray-500">{p.address_city}, {p.address_state} {p.address_zip}</p>
                  <p className="text-xs text-gray-400 mt-1">{p.property_type}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No properties added</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}