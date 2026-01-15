import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Plus,
  Search,
  Globe,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Sparkles,
  Loader,
} from 'lucide-react';

export default function Lenders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [newLender, setNewLender] = useState({
    name: '',
    company_name: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    lender_type: '',
    loan_programs: '',
    min_loan: '',
    max_loan: '',
    dscr_min_ratio: '',
    ltv_max: '',
    notes: '',
  });

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders'],
    queryFn: () => base44.entities.Contact.filter({ is_lender: true }),
  });

  const addLenderMutation = useMutation({
    mutationFn: (data) => base44.entities.Contact.create({
      ...data,
      is_lender: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      setIsAddOpen(false);
      resetForm();
    },
  });

  const aiSearchMutation = useMutation({
    mutationFn: async (lenderName) => {
      setIsSearching(true);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Research this lending company and return structured data in JSON: "${lenderName}"
        
Return ONLY valid JSON (no markdown) with this exact structure:
{
  "company_name": "full company name",
  "website": "website URL or null",
  "phone": "phone number or null",
  "email": "general contact email or null",
  "address": "street address or null",
  "city": "city or null",
  "state": "state or null",
  "zip": "zip code or null",
  "lender_type": "type like DSCR, Hard Money, Bank, Non-QM, etc.",
  "loan_programs": "comma-separated list of loan programs they offer",
  "min_loan": "minimum loan amount in dollars or null",
  "max_loan": "maximum loan amount in dollars or null",
  "dscr_min_ratio": "minimum DSCR ratio they require or null",
  "ltv_max": "maximum LTV percentage or null"
}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            company_name: { type: 'string' },
            website: { type: ['string', 'null'] },
            phone: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] },
            address: { type: ['string', 'null'] },
            city: { type: ['string', 'null'] },
            state: { type: ['string', 'null'] },
            zip: { type: ['string', 'null'] },
            lender_type: { type: 'string' },
            loan_programs: { type: 'string' },
            min_loan: { type: ['string', 'null'] },
            max_loan: { type: ['string', 'null'] },
            dscr_min_ratio: { type: ['string', 'null'] },
            ltv_max: { type: ['string', 'null'] },
          },
        },
      });
      return response;
    },
    onSuccess: (data) => {
      setNewLender(prev => ({
        ...prev,
        company_name: data.company_name || '',
        website: data.website || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zip: data.zip || '',
        lender_type: data.lender_type || '',
        loan_programs: data.loan_programs || '',
        min_loan: data.min_loan || '',
        max_loan: data.max_loan || '',
        dscr_min_ratio: data.dscr_min_ratio || '',
        ltv_max: data.ltv_max || '',
      }));
      setIsSearching(false);
    },
    onError: () => {
      alert('Error searching for lender. Try manual entry.');
      setIsSearching(false);
    },
  });

  const handleAISearch = () => {
    if (!newLender.name.trim()) {
      alert('Please enter a lender name first');
      return;
    }
    aiSearchMutation.mutate(newLender.name);
  };

  const resetForm = () => {
    setNewLender({
      name: '',
      company_name: '',
      website: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      lender_type: '',
      loan_programs: '',
      min_loan: '',
      max_loan: '',
      dscr_min_ratio: '',
      ltv_max: '',
      notes: '',
    });
  };

  const filteredLenders = lenders.filter(lender => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lender.company_name?.toLowerCase().includes(search) ||
      lender.name?.toLowerCase().includes(search) ||
      lender.lender_type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Lender Management
          </h1>
          <p className="text-gray-500 mt-1">Manage lending partners and loan programs</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              Add Lender
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lender</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* AI Search Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <Label className="font-semibold text-blue-900">AI-Powered Lender Search</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., 'Loan Depot' or 'Capital One Home Loans'"
                    value={newLender.name}
                    onChange={(e) => setNewLender({ ...newLender, name: e.target.value })}
                  />
                  <Button
                    onClick={handleAISearch}
                    disabled={isSearching || !newLender.name.trim()}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    {isSearching ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-blue-700">AI will auto-fill company details from web research</p>
              </div>

              {/* Company Info */}
              <div className="space-y-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name*</Label>
                    <Input
                      value={newLender.company_name}
                      onChange={(e) => setNewLender({ ...newLender, company_name: e.target.value })}
                      placeholder="Legal company name"
                    />
                  </div>
                  <div>
                    <Label>Lender Type*</Label>
                    <Select
                      value={newLender.lender_type}
                      onValueChange={(v) => setNewLender({ ...newLender, lender_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DSCR">DSCR</SelectItem>
                        <SelectItem value="Non-QM">Non-QM</SelectItem>
                        <SelectItem value="Bank">Bank</SelectItem>
                        <SelectItem value="Hard Money">Hard Money</SelectItem>
                        <SelectItem value="Portfolio">Portfolio</SelectItem>
                        <SelectItem value="Correspondent">Correspondent</SelectItem>
                        <SelectItem value="Broker">Broker</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </Label>
                    <Input
                      value={newLender.phone}
                      onChange={(e) => setNewLender({ ...newLender, phone: e.target.value })}
                      placeholder="(555) 555-5555"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={newLender.email}
                      onChange={(e) => setNewLender({ ...newLender, email: e.target.value })}
                      placeholder="contact@lender.com"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    value={newLender.website}
                    onChange={(e) => setNewLender({ ...newLender, website: e.target.value })}
                    placeholder="https://www.lender.com"
                  />
                </div>

                {/* Address */}
                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Address
                  </Label>
                  <Input
                    value={newLender.address}
                    onChange={(e) => setNewLender({ ...newLender, address: e.target.value })}
                    placeholder="Street address"
                    className="mb-2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={newLender.city}
                      onChange={(e) => setNewLender({ ...newLender, city: e.target.value })}
                      placeholder="City"
                    />
                    <Input
                      value={newLender.state}
                      onChange={(e) => setNewLender({ ...newLender, state: e.target.value })}
                      placeholder="State"
                      maxLength={2}
                    />
                    <Input
                      value={newLender.zip}
                      onChange={(e) => setNewLender({ ...newLender, zip: e.target.value })}
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                {/* Loan Programs */}
                <div>
                  <Label>Loan Programs</Label>
                  <Textarea
                    value={newLender.loan_programs}
                    onChange={(e) => setNewLender({ ...newLender, loan_programs: e.target.value })}
                    placeholder="DSCR, Fix & Flip, Rental, Bridge, etc."
                    className="h-16"
                  />
                </div>

                {/* Loan Terms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Min Loan Amount
                    </Label>
                    <Input
                      type="number"
                      value={newLender.min_loan}
                      onChange={(e) => setNewLender({ ...newLender, min_loan: e.target.value })}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Max Loan Amount
                    </Label>
                    <Input
                      type="number"
                      value={newLender.max_loan}
                      onChange={(e) => setNewLender({ ...newLender, max_loan: e.target.value })}
                      placeholder="5000000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min DSCR Ratio</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newLender.dscr_min_ratio}
                      onChange={(e) => setNewLender({ ...newLender, dscr_min_ratio: e.target.value })}
                      placeholder="1.0"
                    />
                  </div>
                  <div>
                    <Label>Max LTV %</Label>
                    <Input
                      type="number"
                      value={newLender.ltv_max}
                      onChange={(e) => setNewLender({ ...newLender, ltv_max: e.target.value })}
                      placeholder="75"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={newLender.notes}
                    onChange={(e) => setNewLender({ ...newLender, notes: e.target.value })}
                    placeholder="Additional details..."
                    className="h-16"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    if (!newLender.company_name) {
                      alert('Please enter company name');
                      return;
                    }
                    addLenderMutation.mutate(newLender);
                  }}
                  disabled={addLenderMutation.isPending}
                >
                  {addLenderMutation.isPending ? 'Adding...' : 'Add Lender'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search lenders by name, type, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lenders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLenders.length === 0 ? (
          <Card className="col-span-full border-gray-200">
            <CardContent className="py-12 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No lenders yet. Add your first lender!</p>
            </CardContent>
          </Card>
        ) : (
          filteredLenders.map((lender) => (
            <Card key={lender.id} className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>

                <h3 className="font-bold text-gray-900 mb-1">{lender.company_name || lender.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{lender.lender_type || 'Lending Partner'}</p>

                <div className="space-y-2 mb-4 text-xs text-gray-600">
                  {lender.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {lender.phone}
                    </div>
                  )}
                  {lender.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {lender.email}
                    </div>
                  )}
                  {(lender.min_loan || lender.max_loan) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      ${parseInt(lender.min_loan || 0) / 1000}K - ${parseInt(lender.max_loan || 0) / 1000000}M
                    </div>
                  )}
                  {lender.dscr_min_ratio && (
                    <p className="text-xs">Min DSCR: {lender.dscr_min_ratio}</p>
                  )}
                </div>

                {lender.loan_programs && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {lender.loan_programs.split(',').slice(0, 3).map((prog, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {prog.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}