import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Check, AlertCircle, DollarSign, Home, User, Settings } from 'lucide-react';
import DealCalculator from '../components/deal-wizard/DealCalculator';
import BlanketAllocationPanel from '../components/deal-wizard/BlanketAllocationPanel';
import BorrowerSelector from '../components/deal-wizard/BorrowerSelector';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function LoanApplicationWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  const [dealData, setDealData] = useState({
    loan_product: 'DSCR',
    loan_purpose: 'Purchase',
    loan_amount: '',
    purchase_price: '',
    interest_rate: '',
    loan_term_months: '360',
    amortization_type: 'fixed',
    is_blanket: false,
    notes: '',
  });

  const [properties, setProperties] = useState([]);
  const [currentProperty, setCurrentProperty] = useState({
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    county: '',
    property_type: '',
    year_built: '',
    sqft: '',
    beds: '',
    baths: '',
    gross_rent_monthly: '',
    other_income_monthly: '',
    taxes_monthly: '',
    insurance_monthly: '',
    hoa_monthly: '',
    flood_insurance_monthly: '',
  });

  const [borrowers, setBorrowers] = useState([]);

  const handleAddProperty = () => {
    if (!currentProperty.address_street || !currentProperty.property_type) return;
    
    const prop = {
      id: `prop_${Date.now()}`,
      ...currentProperty,
      gross_rent_monthly: parseFloat(currentProperty.gross_rent_monthly) || 0,
      taxes_monthly: parseFloat(currentProperty.taxes_monthly) / 12 || 0,
      insurance_monthly: parseFloat(currentProperty.insurance_monthly) / 12 || 0,
    };

    setProperties([...properties, prop]);
    setCurrentProperty({
      address_street: '',
      address_city: '',
      address_state: '',
      address_zip: '',
      county: '',
      property_type: '',
      year_built: '',
      sqft: '',
      beds: '',
      baths: '',
      gross_rent_monthly: '',
      other_income_monthly: '',
      taxes_monthly: '',
      insurance_monthly: '',
      hoa_monthly: '',
      flood_insurance_monthly: '',
    });
  };

  const createDealMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      if (!user?.org_id) throw new Error('Organization not found');

      if (!borrowers.length || !properties.length) {
        throw new Error('Please add at least one borrower and property');
      }

      const response = await base44.functions.invoke('createOrUpdateDeal', {
        org_id: user.org_id,
        loan_product: dealData.loan_product,
        loan_purpose: dealData.loan_purpose,
        is_blanket: dealData.is_blanket,
        loan_amount: parseFloat(dealData.loan_amount),
        purchase_price: parseFloat(dealData.purchase_price),
        interest_rate: parseFloat(dealData.interest_rate),
        loan_term_months: parseInt(dealData.loan_term_months),
        amortization_type: dealData.amortization_type,
        assigned_to_user_id: user.id,
        borrowers,
        properties
      });

      return response.data.deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      navigate(createPageUrl(`DealDetail?id=${deal.id}`));
    },
  });

  const canProceed = () => {
    switch(step) {
      case 1:
        return dealData.loan_product && dealData.loan_purpose && dealData.loan_amount && dealData.interest_rate;
      case 2:
        return properties.length > 0;
      case 3:
        return borrowers.length > 0;
      default:
        return false;
    }
  };

  const progressPercent = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="mb-4 text-slate-300 hover:text-white"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold text-white mb-2">New Loan Application</h1>
          <p className="text-slate-400">Complete all 3 steps to create your loan</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  s < step ? 'bg-green-600 text-white' :
                  s === step ? 'bg-blue-600 text-white ring-4 ring-blue-400/30' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {s < step ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div className={`h-1 flex-1 mx-2 transition-all ${
                    s < step ? 'bg-green-600' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Calculator Preview */}
        {step > 1 && dealData.loan_amount && dealData.interest_rate && properties.length > 0 && (
          <div className="mb-6">
            <DealCalculator deal={dealData} properties={properties} />
          </div>
        )}

        {/* Step 1: Loan Details */}
        {step === 1 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Loan Details</CardTitle>
              <CardDescription>Set up the basic loan parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Loan Product *</Label>
                  <Select
                    value={dealData.loan_product}
                    onValueChange={(v) => {
                      const isBlanket = v === 'DSCR Blanket';
                      setDealData({ ...dealData, loan_product: v, is_blanket: isBlanket });
                    }}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="DSCR" className="text-white">DSCR</SelectItem>
                      <SelectItem value="DSCR - No Ratio" className="text-white">DSCR - No Ratio</SelectItem>
                      <SelectItem value="Commercial" className="text-white">Commercial</SelectItem>
                      <SelectItem value="DSCR Blanket" className="text-white">DSCR Blanket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Loan Purpose *</Label>
                  <Select
                    value={dealData.loan_purpose}
                    onValueChange={(v) => setDealData({ ...dealData, loan_purpose: v })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="Purchase" className="text-white">Purchase</SelectItem>
                      <SelectItem value="Refinance" className="text-white">Refinance</SelectItem>
                      <SelectItem value="Cash-Out Refinance" className="text-white">Cash-Out Refinance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Loan Amount ($) *</Label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={dealData.loan_amount}
                    onChange={(e) => setDealData({ ...dealData, loan_amount: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Purchase Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="625000"
                    value={dealData.purchase_price}
                    onChange={(e) => setDealData({ ...dealData, purchase_price: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Interest Rate (%) *</Label>
                  <Input
                    type="number"
                    step="0.125"
                    placeholder="7.5"
                    value={dealData.interest_rate}
                    onChange={(e) => setDealData({ ...dealData, interest_rate: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Loan Term</Label>
                  <Select
                    value={dealData.loan_term_months}
                    onValueChange={(v) => setDealData({ ...dealData, loan_term_months: v })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="360" className="text-white">30 Years</SelectItem>
                      <SelectItem value="180" className="text-white">15 Years</SelectItem>
                      <SelectItem value="120" className="text-white">10 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Amortization</Label>
                  <Select
                    value={dealData.amortization_type}
                    onValueChange={(v) => setDealData({ ...dealData, amortization_type: v })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="fixed" className="text-white">Fixed</SelectItem>
                      <SelectItem value="io" className="text-white">Interest Only</SelectItem>
                      <SelectItem value="arm" className="text-white">ARM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Notes</Label>
                <Textarea
                  placeholder="Any additional information about this loan..."
                  value={dealData.notes}
                  onChange={(e) => setDealData({ ...dealData, notes: e.target.value })}
                  rows={3}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Property */}
        {step === 2 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Property Details</CardTitle>
              <CardDescription>{dealData.is_blanket ? 'Add each property for the blanket loan' : 'Enter the subject property information'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {properties.length > 0 && dealData.is_blanket && (
                <BlanketAllocationPanel
                  properties={properties}
                  loanAmount={parseFloat(dealData.loan_amount) || 0}
                  interestRate={parseFloat(dealData.interest_rate) || 0}
                  loanTermMonths={parseInt(dealData.loan_term_months)}
                  onAllocationsChange={() => {}}
                />
              )}

              <AddressAutocomplete 
                value={currentProperty.address_street}
                onChange={(val) => setCurrentProperty({ ...currentProperty, address_street: val })}
                onAddressParsed={(parsed) => {
                  setCurrentProperty({ 
                    ...currentProperty, 
                    address_street: parsed.street,
                    address_city: parsed.city,
                    address_state: parsed.state,
                    address_zip: parsed.zip,
                    county: parsed.county,
                  });
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Property Type *</Label>
                  <Select
                    value={currentProperty.property_type}
                    onValueChange={(v) => setCurrentProperty({ ...currentProperty, property_type: v })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="SFR" className="text-white">Single Family</SelectItem>
                      <SelectItem value="Condo" className="text-white">Condo</SelectItem>
                      <SelectItem value="Townhouse" className="text-white">Townhouse</SelectItem>
                      <SelectItem value="2-Unit" className="text-white">2-Unit</SelectItem>
                      <SelectItem value="5+ Unit" className="text-white">Multifamily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Year Built</Label>
                  <Input
                    type="number"
                    placeholder="2020"
                    value={currentProperty.year_built}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, year_built: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Sq Ft</Label>
                  <Input
                    type="number"
                    placeholder="3500"
                    value={currentProperty.sqft}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, sqft: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Beds</Label>
                  <Input
                    type="number"
                    placeholder="4"
                    value={currentProperty.beds}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, beds: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Baths</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="2.5"
                    value={currentProperty.baths}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, baths: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Gross Monthly Rent ($)</Label>
                  <Input
                    type="number"
                    placeholder="3500"
                    value={currentProperty.gross_rent_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, gross_rent_monthly: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Other Monthly Income ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentProperty.other_income_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, other_income_monthly: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Annual Taxes ($)</Label>
                  <Input
                    type="number"
                    placeholder="6000"
                    value={currentProperty.taxes_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, taxes_monthly: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Annual Insurance ($)</Label>
                  <Input
                    type="number"
                    placeholder="2400"
                    value={currentProperty.insurance_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, insurance_monthly: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Annual Flood Ins ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentProperty.flood_insurance_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, flood_insurance_monthly: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddProperty}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                {properties.length > 0 ? '+ Add Another Property' : '+ Add Property'}
              </Button>

              {properties.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-600">
                  <h3 className="font-medium text-white">Added Properties ({properties.length})</h3>
                  {properties.map((prop, idx) => (
                    <div key={prop.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div>
                        <p className="text-sm font-medium text-white">{prop.address_street}</p>
                        <p className="text-xs text-slate-400">{prop.address_city}, {prop.address_state} {prop.address_zip}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setProperties(properties.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Borrowers */}
        {step === 3 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Borrowers</CardTitle>
              <CardDescription>Add primary and co-borrowers</CardDescription>
            </CardHeader>
            <CardContent>
              <BorrowerSelector onBorrowersChange={setBorrowers} />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between gap-4 mt-8">
          <Button 
            variant="outline" 
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={() => createDealMutation.mutate()}
              disabled={!canProceed() || createDealMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              {createDealMutation.isPending ? 'Creating...' : 'Create Loan'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}