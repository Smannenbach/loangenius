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

export default function NewDeal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('loan');
  
  const [dealData, setDealData] = useState({
    loan_type: '',
    loan_purpose: 'purchase',
    loan_amount: '',
    purchase_price: '',
    interest_rate: '',
    loan_term_months: '360',
    notes: '',
  });

  const [propertyData, setPropertyData] = useState({
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    property_type: '',
    monthly_rent: '',
    annual_taxes: '',
    annual_insurance: '',
    monthly_hoa: '',
  });

  const [borrowerData, setBorrowerData] = useState({
    borrower_type: 'individual',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    entity_name: '',
    credit_score: '',
  });

  const createDealMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const orgId = user.org_id || 'default';
      
      // Generate deal number
      const dealNumber = `DL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      
      // Calculate DSCR and LTV if possible
      const loanAmount = parseFloat(dealData.loan_amount) || 0;
      const purchasePrice = parseFloat(dealData.purchase_price) || 0;
      const rate = parseFloat(dealData.interest_rate) || 0;
      const termMonths = parseInt(dealData.loan_term_months) || 360;
      const monthlyRent = parseFloat(propertyData.monthly_rent) || 0;
      const annualTaxes = parseFloat(propertyData.annual_taxes) || 0;
      const annualInsurance = parseFloat(propertyData.annual_insurance) || 0;
      const monthlyHoa = parseFloat(propertyData.monthly_hoa) || 0;

      // Calculate P&I
      const monthlyRate = rate / 100 / 12;
      let monthlyPi = 0;
      if (monthlyRate > 0 && loanAmount > 0) {
        monthlyPi = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                    (Math.pow(1 + monthlyRate, termMonths) - 1);
      }

      // Calculate total monthly payment (PITI)
      const monthlyTaxes = annualTaxes / 12;
      const monthlyInsurance = annualInsurance / 12;
      const totalMonthly = monthlyPi + monthlyTaxes + monthlyInsurance + monthlyHoa;

      // Calculate DSCR
      const dscr = totalMonthly > 0 ? monthlyRent / totalMonthly : 0;

      // Calculate LTV
      const ltv = purchasePrice > 0 ? (loanAmount / purchasePrice) * 100 : 0;

      // Create deal
      const deal = await base44.entities.Deal.create({
        org_id: orgId,
        deal_number: dealNumber,
        loan_type: dealData.loan_type,
        loan_purpose: dealData.loan_purpose,
        loan_amount: loanAmount,
        purchase_price: purchasePrice,
        interest_rate: rate,
        loan_term_months: termMonths,
        notes: dealData.notes,
        status: 'lead',
        dscr_ratio: parseFloat(dscr.toFixed(3)),
        ltv_ratio: parseFloat(ltv.toFixed(2)),
        monthly_pi: parseFloat(monthlyPi.toFixed(2)),
        total_monthly_payment: parseFloat(totalMonthly.toFixed(2)),
        calculation_timestamp: new Date().toISOString(),
      });

      // Create property if data provided
      if (propertyData.address_street) {
        await base44.entities.Property.create({
          org_id: orgId,
          deal_id: deal.id,
          is_subject_property: true,
          address_street: propertyData.address_street,
          address_city: propertyData.address_city,
          address_state: propertyData.address_state,
          address_zip: propertyData.address_zip,
          property_type: propertyData.property_type,
          monthly_rent: monthlyRent,
          annual_taxes: annualTaxes,
          annual_insurance: annualInsurance,
          monthly_hoa: monthlyHoa,
        });
      }

      // Create borrower if data provided
      if (borrowerData.first_name || borrowerData.entity_name) {
        const borrower = await base44.entities.Borrower.create({
          org_id: orgId,
          borrower_type: borrowerData.borrower_type,
          first_name: borrowerData.first_name,
          last_name: borrowerData.last_name,
          email: borrowerData.email,
          phone: borrowerData.phone,
          entity_name: borrowerData.entity_name,
          credit_score: borrowerData.credit_score ? parseInt(borrowerData.credit_score) : null,
        });

        // Link borrower to deal
        await base44.entities.DealBorrower.create({
          org_id: orgId,
          deal_id: deal.id,
          borrower_id: borrower.id,
          role: 'primary',
        });

        // Update deal with primary borrower
        await base44.entities.Deal.update(deal.id, {
          primary_borrower_id: borrower.id,
        });
      }

      return deal;
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      navigate(createPageUrl(`DealDetail?id=${deal.id}`));
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
                  <Label>Loan Type *</Label>
                  <Select
                    value={dealData.loan_type}
                    onValueChange={(v) => setDealData({ ...dealData, loan_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select loan type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dscr_purchase">DSCR Purchase</SelectItem>
                      <SelectItem value="dscr_rate_term_refi">DSCR Rate/Term Refi</SelectItem>
                      <SelectItem value="dscr_cashout_refi">DSCR Cash-Out Refi</SelectItem>
                      <SelectItem value="dscr_blanket">DSCR Blanket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Loan Purpose</Label>
                  <Select
                    value={dealData.loan_purpose}
                    onValueChange={(v) => setDealData({ ...dealData, loan_purpose: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="rate_term_refinance">Rate/Term Refinance</SelectItem>
                      <SelectItem value="cash_out_refinance">Cash-Out Refinance</SelectItem>
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
              <CardDescription>Enter subject property details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  placeholder="123 Main Street"
                  value={propertyData.address_street}
                  onChange={(e) => setPropertyData({ ...propertyData, address_street: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="Los Angeles"
                    value={propertyData.address_city}
                    onChange={(e) => setPropertyData({ ...propertyData, address_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    placeholder="CA"
                    maxLength={2}
                    value={propertyData.address_state}
                    onChange={(e) => setPropertyData({ ...propertyData, address_state: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input
                    placeholder="90210"
                    value={propertyData.address_zip}
                    onChange={(e) => setPropertyData({ ...propertyData, address_zip: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select
                  value={propertyData.property_type}
                  onValueChange={(v) => setPropertyData({ ...propertyData, property_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sfr">Single Family</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="2_4_unit">2-4 Unit</SelectItem>
                    <SelectItem value="multifamily">Multifamily (5+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Rent ($)</Label>
                  <Input
                    type="number"
                    placeholder="3500"
                    value={propertyData.monthly_rent}
                    onChange={(e) => setPropertyData({ ...propertyData, monthly_rent: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Taxes ($)</Label>
                  <Input
                    type="number"
                    placeholder="6000"
                    value={propertyData.annual_taxes}
                    onChange={(e) => setPropertyData({ ...propertyData, annual_taxes: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Annual Insurance ($)</Label>
                  <Input
                    type="number"
                    placeholder="2400"
                    value={propertyData.annual_insurance}
                    onChange={(e) => setPropertyData({ ...propertyData, annual_insurance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly HOA ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={propertyData.monthly_hoa}
                    onChange={(e) => setPropertyData({ ...propertyData, monthly_hoa: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrower">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Borrower Information</CardTitle>
              <CardDescription>Enter primary borrower details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Borrower Type</Label>
                <Select
                  value={borrowerData.borrower_type}
                  onValueChange={(v) => setBorrowerData({ ...borrowerData, borrower_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="entity">Business Entity (LLC, Corp, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {borrowerData.borrower_type === 'individual' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                      placeholder="John"
                      value={borrowerData.first_name}
                      onChange={(e) => setBorrowerData({ ...borrowerData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input
                      placeholder="Smith"
                      value={borrowerData.last_name}
                      onChange={(e) => setBorrowerData({ ...borrowerData, last_name: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Entity Name</Label>
                  <Input
                    placeholder="ABC Investments LLC"
                    value={borrowerData.entity_name}
                    onChange={(e) => setBorrowerData({ ...borrowerData, entity_name: e.target.value })}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={borrowerData.email}
                    onChange={(e) => setBorrowerData({ ...borrowerData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="(555) 123-4567"
                    value={borrowerData.phone}
                    onChange={(e) => setBorrowerData({ ...borrowerData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Credit Score</Label>
                <Input
                  type="number"
                  placeholder="720"
                  min="300"
                  max="850"
                  value={borrowerData.credit_score}
                  onChange={(e) => setBorrowerData({ ...borrowerData, credit_score: e.target.value })}
                />
              </div>
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
          disabled={!dealData.loan_type || createDealMutation.isPending}
        >
          <Save className="h-4 w-4" />
          {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
        </Button>
      </div>
    </div>
  );
}