import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
  Edit,
  Trash2,
  Filter,
  Grid,
  List,
  Percent,
  TrendingUp,
  AlertCircle,
  Copy,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Lenders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedLender, setSelectedLender] = useState(null);
  const [editingLender, setEditingLender] = useState(null);
  const [lenderSearchQuery, setLenderSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLenders, setSelectedLenders] = useState(new Set());
  const [newLender, setNewLender] = useState({
    company_name: '',
    contact_name: '',
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
    interest_rate_range: '',
    states_covered: '',
    turnaround_time: '',
    notes: '',
    rating: '',
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

  const { data: lenders = [], isLoading } = useQuery({
    queryKey: ['lenders', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          const contacts = await base44.entities.Contact.filter({ org_id: orgId, contact_type: 'entity' });
          return contacts.filter(c => c.lender_type || c.entity_type === 'lender');
        }
        const allContacts = await base44.entities.Contact.list();
        return allContacts.filter(c => c.contact_type === 'entity' && (c.lender_type || c.entity_type === 'lender'));
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
      const lenderData = {
        org_id: orgId || 'default',
        contact_type: 'entity',
        entity_name: data.company_name,
        entity_type: 'lender',
        first_name: data.contact_name?.split(' ')[0] || '',
        last_name: data.contact_name?.split(' ').slice(1).join(' ') || '',
        email: data.email,
        phone: data.phone,
        address_street: data.address,
        address_city: data.city,
        address_state: data.state,
        address_zip: data.zip,
        custom_fields: {
          website: data.website,
          lender_type: data.lender_type,
          loan_programs: data.loan_programs,
          min_loan: data.min_loan,
          max_loan: data.max_loan,
          dscr_min_ratio: data.dscr_min_ratio,
          ltv_max: data.ltv_max,
          interest_rate_range: data.interest_rate_range,
          states_covered: data.states_covered,
          turnaround_time: data.turnaround_time,
          rating: data.rating,
        },
        notes: data.notes,
        lender_type: data.lender_type,
      };
      
      if (editingLender) {
        return base44.entities.Contact.update(editingLender.id, lenderData);
      }
      return base44.entities.Contact.create(lenderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      setIsAddOpen(false);
      resetForm();
      toast.success(editingLender ? 'Lender updated successfully!' : 'Lender added successfully!');
      setEditingLender(null);
    },
    onError: (error) => {
      toast.error('Failed to save lender: ' + error.message);
    },
  });

  const deleteLenderMutation = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lenders'] });
      toast.success('Lender deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete lender: ' + error.message);
    },
  });

  const aiSearchMutation = useMutation({
    mutationFn: async (query) => {
      setIsSearching(true);
      const prompt = `You are a mortgage industry expert. Search for real DSCR and investment property lenders based on: "${query}".

Return up to 15 REAL lenders with accurate information. Include well-known DSCR lenders.

For each lender provide:
- company_name: Official company name
- lender_type: Primary type (DSCR, Non-QM, Hard Money, Bridge, Portfolio, etc.)
- description: 2-3 sentences about their programs, rates, and specialties
- website: Their official website URL
- min_loan: Typical minimum loan amount (e.g., "$75,000")
- max_loan: Typical maximum loan amount (e.g., "$5,000,000")
- min_dscr: Minimum DSCR ratio they accept (e.g., "0.75" or "1.0")
- max_ltv: Maximum LTV they offer (e.g., "80%")
- interest_rate_range: Typical rate range (e.g., "7.5% - 10%")
- states: States they lend in (or "Nationwide")
- turnaround_time: Typical closing time (e.g., "14-21 days")
- loan_programs: Types of programs offered`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
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
                  interest_rate_range: { type: 'string' },
                  states: { type: 'string' },
                  turnaround_time: { type: 'string' },
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
      toast.error('Search failed: ' + error.message);
      setIsSearching(false);
    },
  });

  const handleAISearch = () => {
    if (!lenderSearchQuery.trim()) {
      toast.error('Enter a search term like "DSCR lenders" or a company name');
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

  const handleAddSelectedLenders = async () => {
    let addedCount = 0;
    for (const id of selectedLenders) {
      const result = searchResults.find(r => r.company_name === id);
      if (result) {
        try {
          await addLenderMutation.mutateAsync({
            company_name: result.company_name,
            lender_type: result.lender_type || 'DSCR',
            loan_programs: result.loan_programs || '',
            website: result.website || '',
            min_loan: result.min_loan || '',
            max_loan: result.max_loan || '',
            dscr_min_ratio: result.min_dscr || '',
            ltv_max: result.max_ltv || '',
            interest_rate_range: result.interest_rate_range || '',
            states_covered: result.states || '',
            turnaround_time: result.turnaround_time || '',
            notes: result.description || '',
          });
          addedCount++;
        } catch (e) {
          console.error('Failed to add lender:', result.company_name);
        }
      }
    }
    toast.success(`Added ${addedCount} lender${addedCount !== 1 ? 's' : ''}`);
    setIsSearchOpen(false);
    setSelectedLenders(new Set());
    setSearchResults([]);
    setLenderSearchQuery('');
  };

  const handleEditLender = (lender) => {
    setEditingLender(lender);
    const cf = lender.custom_fields || {};
    setNewLender({
      company_name: lender.entity_name || lender.company_name || '',
      contact_name: `${lender.first_name || ''} ${lender.last_name || ''}`.trim(),
      website: cf.website || lender.website || '',
      phone: lender.phone || '',
      email: lender.email || '',
      address: lender.address_street || lender.address || '',
      city: lender.address_city || lender.city || '',
      state: lender.address_state || lender.state || '',
      zip: lender.address_zip || lender.zip || '',
      lender_type: cf.lender_type || lender.lender_type || '',
      loan_programs: cf.loan_programs || lender.loan_programs || '',
      min_loan: cf.min_loan || lender.min_loan || '',
      max_loan: cf.max_loan || lender.max_loan || '',
      dscr_min_ratio: cf.dscr_min_ratio || lender.dscr_min_ratio || '',
      ltv_max: cf.ltv_max || lender.ltv_max || '',
      interest_rate_range: cf.interest_rate_range || '',
      states_covered: cf.states_covered || '',
      turnaround_time: cf.turnaround_time || '',
      notes: lender.notes || '',
      rating: cf.rating || '',
    });
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setNewLender({
      company_name: '',
      contact_name: '',
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
      interest_rate_range: '',
      states_covered: '',
      turnaround_time: '',
      notes: '',
      rating: '',
    });
    setEditingLender(null);
  };

  const getLenderTypeColor = (type) => {
    const colors = {
      'DSCR': 'bg-blue-100 text-blue-700',
      'Non-QM': 'bg-purple-100 text-purple-700',
      'Hard Money': 'bg-orange-100 text-orange-700',
      'Bridge': 'bg-yellow-100 text-yellow-700',
      'Portfolio': 'bg-green-100 text-green-700',
      'Bank': 'bg-slate-100 text-slate-700',
      'Correspondent': 'bg-teal-100 text-teal-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const lenderTypes = [...new Set(lenders.map(l => l.lender_type || l.custom_fields?.lender_type).filter(Boolean))];

  const filteredLenders = lenders.filter(lender => {
    const type = lender.lender_type || lender.custom_fields?.lender_type;
    if (typeFilter !== 'all' && type !== typeFilter) return false;
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (lender.entity_name || lender.company_name || '')?.toLowerCase().includes(search) ||
      (lender.lender_type || '')?.toLowerCase().includes(search) ||
      (lender.notes || '')?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: lenders.length,
    dscr: lenders.filter(l => (l.lender_type || l.custom_fields?.lender_type) === 'DSCR').length,
    hardMoney: lenders.filter(l => (l.lender_type || l.custom_fields?.lender_type) === 'Hard Money').length,
    other: lenders.filter(l => !['DSCR', 'Hard Money'].includes(l.lender_type || l.custom_fields?.lender_type)).length,
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            Lender Database
          </h1>
          <p className="text-gray-500 mt-1">Manage your lending partners and discover new ones</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                AI Lender Search
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Discover Lenders with AI
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder='Try "DSCR lenders nationwide" or "hard money California"'
                    value={lenderSearchQuery}
                    onChange={(e) => setLenderSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleAISearch} disabled={isSearching} className="bg-purple-600 hover:bg-purple-700 gap-2">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {['DSCR lenders', 'Hard money lenders', 'Bridge loan lenders', 'Non-QM lenders'].map((term) => (
                    <Button
                      key={term}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLenderSearchQuery(term);
                        aiSearchMutation.mutate(term);
                      }}
                      disabled={isSearching}
                    >
                      {term}
                    </Button>
                  ))}
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedLenders.size === searchResults.length) {
                              setSelectedLenders(new Set());
                            } else {
                              setSelectedLenders(new Set(searchResults.map(r => r.company_name)));
                            }
                          }}
                        >
                          {selectedLenders.size === searchResults.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        <span className="text-sm text-gray-500">{selectedLenders.size} of {searchResults.length} selected</span>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {searchResults.map((result, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedLenders.has(result.company_name) 
                              ? 'border-purple-500 bg-purple-50' 
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                          onClick={() => handleSelectLender(result)}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedLenders.has(result.company_name)}
                              onChange={() => {}}
                              className="h-5 w-5 rounded mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-gray-900">{result.company_name}</span>
                                <Badge className={getLenderTypeColor(result.lender_type)}>{result.lender_type}</Badge>
                              </div>
                              {result.description && (
                                <p className="text-sm text-gray-600 mb-2">{result.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 text-xs">
                                {result.min_dscr && <Badge variant="outline">DSCR: {result.min_dscr}+</Badge>}
                                {result.max_ltv && <Badge variant="outline">LTV: {result.max_ltv}</Badge>}
                                {result.interest_rate_range && <Badge variant="outline">Rate: {result.interest_rate_range}</Badge>}
                                {result.turnaround_time && <Badge variant="outline">{result.turnaround_time}</Badge>}
                              </div>
                              {result.website && (
                                <a 
                                  href={result.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Visit Website
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {selectedLenders.size > 0 && (
                      <div className="sticky bottom-0 bg-white pt-3 border-t">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 h-11 gap-2"
                          onClick={handleAddSelectedLenders}
                          disabled={addLenderMutation.isPending}
                        >
                          {addLenderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          Add {selectedLenders.size} Lender{selectedLenders.size !== 1 ? 's' : ''} to Database
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
                <Plus className="h-4 w-4" />
                Add Lender
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLender ? 'Edit Lender' : 'Add New Lender'}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="programs">Programs</TabsTrigger>
                  <TabsTrigger value="terms">Terms</TabsTrigger>
                </TabsList>
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Company Name *</Label>
                      <Input
                        value={newLender.company_name}
                        onChange={(e) => setNewLender({ ...newLender, company_name: e.target.value })}
                        placeholder="ABC Lending"
                      />
                    </div>
                    <div>
                      <Label>Lender Type *</Label>
                      <Select value={newLender.lender_type} onValueChange={(v) => setNewLender({ ...newLender, lender_type: v })}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DSCR">DSCR</SelectItem>
                          <SelectItem value="Non-QM">Non-QM</SelectItem>
                          <SelectItem value="Hard Money">Hard Money</SelectItem>
                          <SelectItem value="Bridge">Bridge</SelectItem>
                          <SelectItem value="Portfolio">Portfolio</SelectItem>
                          <SelectItem value="Bank">Bank</SelectItem>
                          <SelectItem value="Correspondent">Correspondent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Contact Name</Label>
                      <Input
                        value={newLender.contact_name}
                        onChange={(e) => setNewLender({ ...newLender, contact_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={newLender.phone}
                        onChange={(e) => setNewLender({ ...newLender, phone: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newLender.email}
                        onChange={(e) => setNewLender({ ...newLender, email: e.target.value })}
                        placeholder="contact@lender.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Website</Label>
                      <Input
                        value={newLender.website}
                        onChange={(e) => setNewLender({ ...newLender, website: e.target.value })}
                        placeholder="https://www.lender.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={newLender.address}
                        onChange={(e) => setNewLender({ ...newLender, address: e.target.value })}
                        placeholder="123 Main St"
                        className="mb-2"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={newLender.city} onChange={(e) => setNewLender({ ...newLender, city: e.target.value })} placeholder="City" />
                        <Input value={newLender.state} onChange={(e) => setNewLender({ ...newLender, state: e.target.value })} placeholder="State" maxLength={2} />
                        <Input value={newLender.zip} onChange={(e) => setNewLender({ ...newLender, zip: e.target.value })} placeholder="ZIP" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="programs" className="space-y-4 mt-4">
                  <div>
                    <Label>Loan Programs</Label>
                    <Textarea
                      value={newLender.loan_programs}
                      onChange={(e) => setNewLender({ ...newLender, loan_programs: e.target.value })}
                      placeholder="DSCR, Fix & Flip, Rental, Bridge, Construction, etc."
                      className="h-24"
                    />
                  </div>
                  <div>
                    <Label>States Covered</Label>
                    <Input
                      value={newLender.states_covered}
                      onChange={(e) => setNewLender({ ...newLender, states_covered: e.target.value })}
                      placeholder="Nationwide, or list specific states"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={newLender.notes}
                      onChange={(e) => setNewLender({ ...newLender, notes: e.target.value })}
                      placeholder="Additional details about this lender..."
                      className="h-24"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="terms" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Min Loan Amount</Label>
                      <Input
                        value={newLender.min_loan}
                        onChange={(e) => setNewLender({ ...newLender, min_loan: e.target.value })}
                        placeholder="$75,000"
                      />
                    </div>
                    <div>
                      <Label>Max Loan Amount</Label>
                      <Input
                        value={newLender.max_loan}
                        onChange={(e) => setNewLender({ ...newLender, max_loan: e.target.value })}
                        placeholder="$5,000,000"
                      />
                    </div>
                    <div>
                      <Label>Min DSCR Ratio</Label>
                      <Input
                        value={newLender.dscr_min_ratio}
                        onChange={(e) => setNewLender({ ...newLender, dscr_min_ratio: e.target.value })}
                        placeholder="0.75"
                      />
                    </div>
                    <div>
                      <Label>Max LTV</Label>
                      <Input
                        value={newLender.ltv_max}
                        onChange={(e) => setNewLender({ ...newLender, ltv_max: e.target.value })}
                        placeholder="80%"
                      />
                    </div>
                    <div>
                      <Label>Interest Rate Range</Label>
                      <Input
                        value={newLender.interest_rate_range}
                        onChange={(e) => setNewLender({ ...newLender, interest_rate_range: e.target.value })}
                        placeholder="7.5% - 10%"
                      />
                    </div>
                    <div>
                      <Label>Turnaround Time</Label>
                      <Input
                        value={newLender.turnaround_time}
                        onChange={(e) => setNewLender({ ...newLender, turnaround_time: e.target.value })}
                        placeholder="14-21 days"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-3 pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Cancel</Button>
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
                  {addLenderMutation.isPending ? 'Saving...' : editingLender ? 'Update Lender' : 'Add Lender'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Lenders</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">DSCR Lenders</p>
                <p className="text-2xl font-bold text-purple-900">{stats.dscr}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Hard Money</p>
                <p className="text-2xl font-bold text-orange-900">{stats.hardMoney}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Other Types</p>
                <p className="text-2xl font-bold text-green-900">{stats.other}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search lenders by name, type, or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {lenderTypes.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="rounded-r-none">
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-l-none">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lenders Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Loading lenders...</p>
        </div>
      ) : filteredLenders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No lenders yet</h3>
            <p className="text-gray-500 mb-4">Add your first lender manually or use AI search to discover lenders</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setIsSearchOpen(true)} className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Search
              </Button>
              <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLenders.map((lender) => {
            const cf = lender.custom_fields || {};
            const name = lender.entity_name || lender.company_name || 'Unknown Lender';
            const type = lender.lender_type || cf.lender_type;
            return (
              <Card key={lender.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getLenderTypeColor(type)}>{type || 'Lender'}</Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedLender(lender); setIsViewOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditLender(lender)}>
                            <Edit className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          {(cf.website || lender.website) && (
                            <DropdownMenuItem onClick={() => window.open(cf.website || lender.website, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />Visit Website
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(lender.email || ''); toast.success('Email copied'); }}>
                            <Copy className="h-4 w-4 mr-2" />Copy Email
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteLenderMutation.mutate(lender.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{name}</h3>
                  <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                    {lender.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" />{lender.phone}</div>}
                    {lender.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" />{lender.email}</div>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(cf.dscr_min_ratio || lender.dscr_min_ratio) && <Badge variant="outline" className="text-xs">DSCR: {cf.dscr_min_ratio || lender.dscr_min_ratio}+</Badge>}
                    {(cf.ltv_max || lender.ltv_max) && <Badge variant="outline" className="text-xs">LTV: {cf.ltv_max || lender.ltv_max}</Badge>}
                    {cf.interest_rate_range && <Badge variant="outline" className="text-xs">{cf.interest_rate_range}</Badge>}
                  </div>
                  {(cf.loan_programs || lender.loan_programs) && (
                    <p className="text-xs text-gray-500 line-clamp-2">{cf.loan_programs || lender.loan_programs}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Terms</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLenders.map((lender) => {
                  const cf = lender.custom_fields || {};
                  const name = lender.entity_name || lender.company_name || 'Unknown';
                  const type = lender.lender_type || cf.lender_type;
                  return (
                    <tr key={lender.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{name}</div>
                        {(cf.website || lender.website) && (
                          <a href={cf.website || lender.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            Website
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3"><Badge className={getLenderTypeColor(type)}>{type || 'Lender'}</Badge></td>
                      <td className="px-4 py-3 text-sm">
                        {lender.phone && <div>{lender.phone}</div>}
                        {lender.email && <div className="text-gray-500">{lender.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {(cf.dscr_min_ratio || lender.dscr_min_ratio) && <Badge variant="outline" className="text-xs">DSCR: {cf.dscr_min_ratio || lender.dscr_min_ratio}+</Badge>}
                          {(cf.ltv_max || lender.ltv_max) && <Badge variant="outline" className="text-xs">LTV: {cf.ltv_max || lender.ltv_max}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedLender(lender); setIsViewOpen(true); }}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditLender(lender)}>Edit</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lender Detail View */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {selectedLender?.entity_name || selectedLender?.company_name}
            </DialogTitle>
          </DialogHeader>
          {selectedLender && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge className={getLenderTypeColor(selectedLender.lender_type || selectedLender.custom_fields?.lender_type)}>
                  {selectedLender.lender_type || selectedLender.custom_fields?.lender_type || 'Lender'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedLender.phone && (
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="font-medium">{selectedLender.phone}</p>
                  </div>
                )}
                {selectedLender.email && (
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="font-medium">{selectedLender.email}</p>
                  </div>
                )}
                {(selectedLender.custom_fields?.website || selectedLender.website) && (
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">Website</Label>
                    <a href={selectedLender.custom_fields?.website || selectedLender.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                      {selectedLender.custom_fields?.website || selectedLender.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <Label className="text-xs text-gray-500 mb-2 block">Loan Terms</Label>
                <div className="flex flex-wrap gap-2">
                  {(selectedLender.custom_fields?.dscr_min_ratio || selectedLender.dscr_min_ratio) && <Badge>Min DSCR: {selectedLender.custom_fields?.dscr_min_ratio || selectedLender.dscr_min_ratio}</Badge>}
                  {(selectedLender.custom_fields?.ltv_max || selectedLender.ltv_max) && <Badge>Max LTV: {selectedLender.custom_fields?.ltv_max || selectedLender.ltv_max}</Badge>}
                  {selectedLender.custom_fields?.interest_rate_range && <Badge>Rate: {selectedLender.custom_fields.interest_rate_range}</Badge>}
                  {selectedLender.custom_fields?.turnaround_time && <Badge>{selectedLender.custom_fields.turnaround_time}</Badge>}
                </div>
              </div>
              {(selectedLender.custom_fields?.loan_programs || selectedLender.loan_programs) && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-gray-500 mb-2 block">Loan Programs</Label>
                  <p className="text-sm">{selectedLender.custom_fields?.loan_programs || selectedLender.loan_programs}</p>
                </div>
              )}
              {selectedLender.notes && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-gray-500 mb-2 block">Notes</Label>
                  <p className="text-sm">{selectedLender.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleEditLender(selectedLender)} className="gap-2">
                  <Edit className="h-4 w-4" />Edit
                </Button>
                {(selectedLender.custom_fields?.website || selectedLender.website) && (
                  <Button onClick={() => window.open(selectedLender.custom_fields?.website || selectedLender.website, '_blank')} className="gap-2">
                    <ExternalLink className="h-4 w-4" />Visit Website
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}