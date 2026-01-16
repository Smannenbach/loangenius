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
  Loader2,
  CheckCircle,
  Star,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Lenders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [lenderSearchQuery, setLenderSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLenders, setSelectedLenders] = useState(new Set());
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get user's org membership
  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: lenders = [] } = useQuery({
    queryKey: ['lenders', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          const contacts = await base44.entities.Contact.filter({ org_id: orgId, contact_type: 'entity' });
          return contacts.filter(c => c.lender_type);
        }
        // Fallback
        const allContacts = await base44.entities.Contact.list();
        return allContacts.filter(c => c.contact_type === 'entity' && c.lender_type);
      } catch (e) {
        try {
          const allContacts = await base44.entities.Contact.list();
          return allContacts.filter(c => c.contact_type === 'entity');
        } catch {
          return [];
        }
      }
    },
    enabled: true,
  });

  const addLenderMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Contact.create({
        org_id: orgId || 'default',
        contact_type: 'entity',
        entity_name: data.company_name,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      setIsAddOpen(false);
      resetForm();
      toast.success('Lender added successfully');
    },
    onError: (error) => {
      console.error('Add lender error:', error);
      toast.error('Failed to add lender');
    },
  });

  const aiSearchMutation = useMutation({
    mutationFn: async (query) => {
      setIsSearching(true);
      const isDSCRSearch = query.toLowerCase().includes('dscr') || query.toLowerCase().includes('investor') || query.toLowerCase().includes('rental');
      
      const prompt = isDSCRSearch 
        ? `You are a mortgage industry expert. Find real DSCR (Debt Service Coverage Ratio) lenders that specialize in investment property loans. Search query: "${query}".

Return 15 REAL lenders with accurate information. Include major national DSCR lenders like Kiavi, Lima One, Visio Lending, RCN Capital, CoreVest, Velocity Mortgage, New Silver, Easy Street Capital, Civic Financial, Angel Oak, Carrington, A&D Mortgage, Deephaven, and others you find.

For each lender provide:
- company_name: Official company name
- lender_type: Primary type (DSCR, Non-QM, Hard Money, etc.)
- description: 2-3 sentences about their DSCR programs, rates, and specialties
- website: Their official website URL
- min_loan: Typical minimum loan amount
- max_loan: Typical maximum loan amount  
- min_dscr: Minimum DSCR ratio they accept
- max_ltv: Maximum LTV they offer
- states: States they lend in (or "Nationwide")
- loan_programs: Types of programs offered`
        : `You are a mortgage industry expert. Research this specific lending company: "${query}".

Provide detailed, accurate information about this lender including:
- company_name: Official company name
- lender_type: Primary type (Bank, Credit Union, DSCR, Non-QM, Hard Money, etc.)
- description: 2-3 sentences about their lending programs and specialties
- website: Their official website URL
- min_loan: Typical minimum loan amount
- max_loan: Typical maximum loan amount
- states: States they lend in
- loan_programs: Types of programs offered`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            results: { 
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  company_name: { type: 'string' },
                  lender_type: { type: 'string' },
                  description: { type: 'string' },
                  website: { type: 'string' },
                  min_loan: { type: 'string' },
                  max_loan: { type: 'string' },
                  min_dscr: { type: 'string' },
                  max_ltv: { type: 'string' },
                  states: { type: 'string' },
                  loan_programs: { type: 'string' },
                }
              }
            },
          },
        },
      });
      const results = Array.isArray(response) ? response : (response.results || [response]);
      return results.filter(r => r && r.company_name);
    },
    onSuccess: (data) => {
      setSearchResults(data && data.length > 0 ? data : []);
      setIsSearching(false);
      if (data && data.length > 0) {
        toast.success(`Found ${data.length} lenders`);
      } else {
        toast.info('No lenders found. Try a different search.');
      }
    },
    onError: (error) => {
      console.error('AI Search error:', error);
      toast.error('Search failed. Try manual entry.');
      setIsSearching(false);
    },
  });

  const handleAISearch = () => {
    if (!lenderSearchQuery.trim()) {
      toast.error('Enter a lender name or "DSCR lenders"');
      return;
    }
    setSearchResults([]);
    setSelectedLenders(new Set());
    aiSearchMutation.mutate(lenderSearchQuery);
  };

  const handleSelectLender = (result) => {
    const id = result.company_name;
    setSelectedLenders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedLenders.size === searchResults.length) {
      setSelectedLenders(new Set());
    } else {
      setSelectedLenders(new Set(searchResults.map(r => r.company_name)));
    }
  };

  const handleAddSelectedLenders = async () => {
    let addedCount = 0;
    for (const id of selectedLenders) {
      const result = searchResults.find(r => r.company_name === id);
      if (result) {
        try {
          await addLenderMutation.mutateAsync({
            company_name: result.company_name,
            lender_type: result.lender_type || 'DSCR',
            loan_programs: result.loan_programs || result.description || '',
            website: result.website || '',
            min_loan: result.min_loan || '',
            max_loan: result.max_loan || '',
            dscr_min_ratio: result.min_dscr || '',
            ltv_max: result.max_ltv || '',
            notes: `${result.description || ''}\nStates: ${result.states || 'Unknown'}`,
          });
          addedCount++;
        } catch (e) {
          console.error('Failed to add lender:', result.company_name, e);
        }
      }
    }
    toast.success(`Added ${addedCount} lender${addedCount !== 1 ? 's' : ''} to your database`);
    setIsSearchOpen(false);
    setSelectedLenders(new Set());
    setSearchResults([]);
    setLenderSearchQuery('');
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
          <p className="text-gray-500 mt-1">{lenders.length} active lenders</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Search
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Search & Add Lenders</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search: 'DSCR Lenders' or specific company name"
                    value={lenderSearchQuery}
                    onChange={(e) => setLenderSearchQuery(e.target.value)}
                  />
                  <Button
                    onClick={handleAISearch}
                    disabled={isSearching || !lenderSearchQuery.trim()}
                    className="bg-blue-600"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <Button variant="outline" size="sm" onClick={handleSelectAll}>
                        {selectedLenders.size === searchResults.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      <span className="text-sm text-gray-500">{searchResults.length} lenders found</span>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {searchResults.map((result, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedLenders.has(result.company_name) 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          onClick={() => handleSelectLender(result)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLenders.has(result.company_name)}
                            onChange={() => handleSelectLender(result)}
                            className="h-5 w-5 rounded mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900">{result.company_name}</p>
                              <Badge className="bg-blue-100 text-blue-700 text-xs">{result.lender_type || 'Lender'}</Badge>
                            </div>
                            {result.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{result.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                              {result.min_dscr && <span className="bg-gray-100 px-2 py-0.5 rounded">Min DSCR: {result.min_dscr}</span>}
                              {result.max_ltv && <span className="bg-gray-100 px-2 py-0.5 rounded">Max LTV: {result.max_ltv}</span>}
                              {result.states && <span className="bg-gray-100 px-2 py-0.5 rounded">{result.states}</span>}
                            </div>
                            {result.website && (
                              <a 
                                href={result.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-3 w-3" />
                                {result.website}
                              </a>
                            )}
                          </div>
                          {selectedLenders.has(result.company_name) && (
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLenders.size > 0 && (
                  <div className="sticky bottom-0 bg-white pt-3 border-t">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 h-11 gap-2"
                      onClick={handleAddSelectedLenders}
                      disabled={addLenderMutation.isPending}
                    >
                      {addLenderMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Add {selectedLenders.size} Lender{selectedLenders.size !== 1 ? 's' : ''} to Database
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              Add Lender
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Lender (Manual Entry)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">

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
                      toast.error('Please enter company name');
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