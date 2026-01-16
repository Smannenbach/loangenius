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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Building2,
  User,
  Calculator,
  Save,
  DollarSign,
  Percent,
  Calendar,
  Home,
  Plus,
} from 'lucide-react';
import DealCalculator from '../components/deal-wizard/DealCalculator';
import BlanketAllocationPanel from '../components/deal-wizard/BlanketAllocationPanel';
import BorrowerSelector from '../components/deal-wizard/BorrowerSelector';
import { toast } from 'sonner';

export default function NewDeal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('loan');
  
  const [dealData, setDealData] = useState({
    loan_product: 'DSCR',
    loan_purpose: 'Purchase',
    loan_amount: '',
    interest_rate: '',
    loan_term_months: '360',
    is_blanket: false,
    notes: '',
  });

  const [properties, setProperties] = useState([]);
  const [currentProperty, setCurrentProperty] = useState({
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    property_type: '',
    gross_rent_monthly: '',
    other_income_monthly: '',
    taxes_monthly: '',
    insurance_monthly: '',
    hoa_monthly: '',
    flood_insurance_monthly: '',
  });

  const [borrowers, setBorrowers] = useState([]);
  const [allocations, setAllocations] = useState([]);

  const handleAddProperty = () => {
    if (!currentProperty.address_street) return;
    
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
      property_type: '',
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
      
      // Get org from membership if not on user
      let orgId = user?.org_id;
      if (!orgId) {
        try {
          const memberships = await base44.entities.OrgMembership.filter({ user_id: user?.email });
          orgId = memberships[0]?.org_id || 'default';
        } catch {
          orgId = 'default';
        }
      }

      if (!borrowers.length) {
        throw new Error('Please add at least one borrower');
      }
      if (!properties.length) {
        throw new Error('Please add at least one property');
      }

      // Create deal directly (simpler approach that works without backend function)
      const deal = await base44.entities.Deal.create({
        org_id: orgId,
        loan_product: dealData.loan_product,
        loan_purpose: dealData.loan_purpose,
        is_blanket: dealData.is_blanket,
        loan_amount: parseFloat(dealData.loan_amount) || 0,
        interest_rate: parseFloat(dealData.interest_rate) || 0,
        loan_term_months: parseInt(dealData.loan_term_months) || 360,
        stage: 'application',
        status: 'active'
      });

      // Create borrowers
      for (const borrower of borrowers) {
        await base44.entities.Borrower.create({
          org_id: orgId,
          first_name: borrower.first_name,
          last_name: borrower.last_name,
          email: borrower.email || '',
          phone: borrower.phone || ''
        });
      }

      // Create properties
      for (const prop of properties) {
        await base44.entities.Property.create({
          org_id: orgId,
          deal_id: deal.id,
          address_street: prop.address_street,
          address_city: prop.address_city,
          address_state: prop.address_state,
          address_zip: prop.address_zip,
          property_type: prop.property_type
        });
      }

      return deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      toast.success('Deal created successfully');
      navigate(createPageUrl(`DealDetail?id=${deal.id}`));
    },
    onError: (error) => {
      console.error('Error creating deal:', error.message);
      toast.error('Error creating deal: ' + error.message);
    },
  });

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4 text-gray-600"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold text-gray-900">Create New Deal</h1>
        <p className="text-gray-500 mt-1">Enter loan, property, and borrower information</p>
      </div>

      {/* Calculator Preview */}
      {dealData.loan_amount && dealData.interest_rate && properties.length > 0 && (
        <div className="mb-6">
          <DealCalculator
            deal={dealData}
            properties={properties}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="loan" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Loan Details
          </TabsTrigger>
          <TabsTrigger value="property" className="gap-2">
            <Home className="h-4 w-4" />
            Property
          </TabsTrigger>
          <TabsTrigger value="borrower" className="gap-2">
            <User className="h-4 w-4" />
            Borrower
          </TabsTrigger>
        </TabsList>

        <TabsContent value="loan">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Loan Information</CardTitle>
              <CardDescription>Enter the basic loan details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Product *</Label>
                  <Select
                    value={dealData.loan_product}
                    onValueChange={(v) => {
                      const isBlanket = v === 'DSCR Blanket';
                      setDealData({ ...dealData, loan_product: v, is_blanket: isBlanket });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select loan product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DSCR">DSCR</SelectItem>
                      <SelectItem value="DSCR - No Ratio">DSCR - No Ratio</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="DSCR Blanket">DSCR Blanket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Loan Purpose *</Label>
                  <Select
                    value={dealData.loan_purpose}
                    onValueChange={(v) => setDealData({ ...dealData, loan_purpose: v })}
                  >
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount ($)</Label>
                  <Input
                    type="number"
                    placeholder="500000"
                    value={dealData.loan_amount}
                    onChange={(e) => setDealData({ ...dealData, loan_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchase Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="625000"
                    value={dealData.purchase_price}
                    onChange={(e) => setDealData({ ...dealData, purchase_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.125"
                    placeholder="7.5"
                    value={dealData.interest_rate}
                    onChange={(e) => setDealData({ ...dealData, interest_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loan Term (months)</Label>
                  <Select
                    value={dealData.loan_term_months}
                    onValueChange={(v) => setDealData({ ...dealData, loan_term_months: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="360">30 Years (360 months)</SelectItem>
                      <SelectItem value="180">15 Years (180 months)</SelectItem>
                      <SelectItem value="120">10 Years (120 months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes about this deal..."
                  value={dealData.notes}
                  onChange={(e) => setDealData({ ...dealData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="property">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Property Information</CardTitle>
              <CardDescription>{dealData.is_blanket ? 'Add multiple properties' : 'Enter subject property details'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {properties.length > 0 && dealData.is_blanket && (
                <BlanketAllocationPanel
                  properties={properties}
                  loanAmount={parseFloat(dealData.loan_amount) || 0}
                  interestRate={parseFloat(dealData.interest_rate) || 0}
                  loanTermMonths={parseInt(dealData.loan_term_months)}
                  onAllocationsChange={(alloc, metrics) => setAllocations(alloc)}
                />
              )}
              <div className="space-y-2">
                <Label>Street Address *</Label>
                <Input
                  placeholder="123 Main Street"
                  value={currentProperty.address_street}
                  onChange={(e) => setCurrentProperty({ ...currentProperty, address_street: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>City *</Label>
                  <Input
                    placeholder="Los Angeles"
                    value={currentProperty.address_city}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, address_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Input
                    placeholder="CA"
                    maxLength={2}
                    value={currentProperty.address_state}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, address_state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP *</Label>
                  <Input
                    placeholder="90210"
                    value={currentProperty.address_zip}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, address_zip: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Property Type *</Label>
                <Select
                  value={currentProperty.property_type}
                  onValueChange={(v) => setCurrentProperty({ ...currentProperty, property_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SFR">Single Family</SelectItem>
                    <SelectItem value="Condo">Condo</SelectItem>
                    <SelectItem value="Townhouse">Townhouse</SelectItem>
                    <SelectItem value="2-Unit">2-Unit</SelectItem>
                    <SelectItem value="5+ Unit">Multifamily (5+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gross Monthly Rent ($)</Label>
                  <Input
                    type="number"
                    placeholder="3500"
                    value={currentProperty.gross_rent_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, gross_rent_monthly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Income (monthly)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentProperty.other_income_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, other_income_monthly: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Annual Taxes ($)</Label>
                  <Input
                    type="number"
                    placeholder="6000"
                    value={currentProperty.taxes_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, taxes_monthly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Insurance ($)</Label>
                  <Input
                    type="number"
                    placeholder="2400"
                    value={currentProperty.insurance_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, insurance_monthly: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly HOA ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentProperty.hoa_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, hoa_monthly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Flood Insurance ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={currentProperty.flood_insurance_monthly}
                    onChange={(e) => setCurrentProperty({ ...currentProperty, flood_insurance_monthly: e.target.value })}
                  />
                </div>
              </div>

              <Button
                onClick={handleAddProperty}
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                {properties.length > 0 ? 'Add Another Property' : 'Add Property'}
              </Button>

              {properties.length > 0 && (
                <div className="space-y-2 pt-4">
                  <h3 className="font-medium text-gray-900">Added Properties ({properties.length})</h3>
                  {properties.map((prop, idx) => (
                    <div key={prop.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{prop.address_street}</p>
                        <p className="text-xs text-gray-500">{prop.address_city}, {prop.address_state}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setProperties(properties.filter((_, i) => i !== idx))}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrower">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Borrowers</CardTitle>
              <CardDescription>Add primary and co-borrowers</CardDescription>
            </CardHeader>
            <CardContent>
              <BorrowerSelector onBorrowersChange={setBorrowers} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-500 gap-2"
          onClick={() => createDealMutation.mutate()}
          disabled={!dealData.loan_product || !borrowers.length || !properties.length || createDealMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
        </Button>
      </div>
    </div>
  );
}