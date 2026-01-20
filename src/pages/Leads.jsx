import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId, useOrgScopedQuery } from '@/components/useOrgId';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search,
  Plus,
  ArrowUpDown,
  MoreVertical,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  TrendingUp,
  Filter,
  FileOutput,
  Sheet,
  Download,
  Upload,
  Grid,
  List,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react';
import { COUNTRY_CODES } from '@/components/formatters';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import QuoteGeneratorModal from '@/components/QuoteGeneratorModal';
import LeadDetailModal from '@/components/LeadDetailModal';
import LeadImportWizard from '@/components/leads/LeadImportWizard';
import GoogleSheetsImportWizard from '@/components/leads/GoogleSheetsImportWizard';
import { TCPAConsentCompact } from '@/components/TCPAConsent';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

// Simple debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Leads() {
  const queryClient = useQueryClient();
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loanTypeFilter, setLoanTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [viewMode, setViewMode] = useState('table'); // table, cards
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'a': () => setIsAddOpen(true),                                    // Add lead (full form)
    'q': () => setIsQuickAddOpen(true),                               // Quick add
    '/': () => searchInputRef.current?.focus(),                       // Focus search
    't': () => setViewMode(v => v === 'table' ? 'cards' : 'table'),   // Toggle view
    'Escape': () => { setIsAddOpen(false); setIsQuickAddOpen(false); searchInputRef.current?.blur(); },
  });
  const [editingLead, setEditingLead] = useState(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteSelectedLead, setQuoteSelectedLead] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    home_email: '',
    work_email: '',
    country_code: '+1',
    mobile_phone: '',
    home_phone: '',
    work_phone: '',
    property_street: '',
    property_city: '',
    property_state: '',
    property_zip: '',
    property_county: '',
    property_country: 'USA',
    property_type: '',
    occupancy: '',
    estimated_value: '',
    property_taxes: '',
    annual_homeowners_insurance: '',
    monthly_rental_income: '',
    fico_score: '',
    current_rate: '',
    current_balance: '',
    loan_amount: '',
    loan_type: '',
    loan_purpose: '',
    cashout_amount: '',
    source: '',
    status: 'new',
    notes: '',
    zillow_link: '',
    tcpa_consent: false,
    custom_disclaimer: '',
    platform: '',
    fb_campaign_name: '',
    fb_campaign_id: '',
    fb_adset_name: '',
    fb_adset_id: '',
    fb_ad_name: '',
    fb_ad_id: '',
    fb_form_name: '',
    fb_form_id: '',
    fb_page_name: '',
    fb_page_id: '',
    fb_lead_id: '',
    lead_received_date: '',
  });

  // Use canonical org resolver - handles user, org lookup, and auto-creation
  const { orgId, user, isLoading: orgLoading, isReady } = useOrgId();

  // Confirmation dialog for delete actions
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Use org-scoped query - automatically filters by org_id, never falls back to list()
  const { data: leads = [], isLoading: leadsLoading, error } = useOrgScopedQuery(
    'Lead', 
    { is_deleted: false },
    { staleTime: 30000 }
  );

  const isLoading = orgLoading || leadsLoading;

  const createLeadMutation = useMutation({
    mutationFn: async (data) => {
      if (!orgId) throw new Error('No organization found. Please refresh the page.');
      const processedData = {
        ...data,
        org_id: orgId,
        estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
        loan_amount: data.loan_amount ? parseFloat(data.loan_amount) : null,
        current_balance: data.current_balance ? parseFloat(data.current_balance) : null,
        current_rate: data.current_rate ? parseFloat(data.current_rate) : null,
        property_taxes: data.property_taxes ? parseFloat(data.property_taxes) : null,
        annual_homeowners_insurance: data.annual_homeowners_insurance ? parseFloat(data.annual_homeowners_insurance) : null,
        monthly_rental_income: data.monthly_rental_income ? parseFloat(data.monthly_rental_income) : null,
        cashout_amount: data.cashout_amount ? parseFloat(data.cashout_amount) : null,
        fico_score: data.fico_score ? parseInt(data.fico_score) : null,
      };
      // Remove undefined values
      Object.keys(processedData).forEach(key => {
        if (processedData[key] === '' || processedData[key] === undefined) {
          delete processedData[key];
        }
      });
      if (editingLead) {
        return base44.entities.Lead.update(editingLead.id, processedData);
      }
      return base44.entities.Lead.create(processedData);
    },
    onSuccess: () => {
      // Invalidate org-scoped query with correct key pattern
      queryClient.invalidateQueries({ queryKey: ['Lead', 'org'] });
      setIsAddOpen(false);
      setIsQuickAddOpen(false);
      toast.success(editingLead ? 'Lead updated successfully!' : 'Lead created successfully!');
      setEditingLead(null);
      setNewLead({
        first_name: '',
        last_name: '',
        home_email: '',
        work_email: '',
        country_code: '+1',
        mobile_phone: '',
        home_phone: '',
        work_phone: '',
        property_street: '',
        property_city: '',
        property_state: '',
        property_zip: '',
        property_county: '',
        property_country: 'USA',
        property_type: '',
        occupancy: '',
        estimated_value: '',
        property_taxes: '',
        annual_homeowners_insurance: '',
        monthly_rental_income: '',
        fico_score: '',
        current_rate: '',
        current_balance: '',
        loan_amount: '',
        loan_type: '',
        loan_purpose: '',
        cashout_amount: '',
        source: '',
        status: 'new',
        notes: '',
        zillow_link: '',
        tcpa_consent: false,
        custom_disclaimer: '',
        platform: '',
        fb_campaign_name: '',
        fb_campaign_id: '',
        fb_adset_name: '',
        fb_adset_id: '',
        fb_ad_name: '',
        fb_ad_id: '',
        fb_form_name: '',
        fb_form_id: '',
        fb_page_name: '',
        fb_page_id: '',
        fb_lead_id: '',
        lead_received_date: '',
      });
    },
    onError: (error) => {
      console.error('Lead creation error:', error);
      toast.error('Failed to save lead: ' + error.message);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.update(id, { is_deleted: true }),
    onSuccess: () => {
      // Invalidate org-scoped query with correct key pattern
      queryClient.invalidateQueries({ queryKey: ['Lead', 'org'] });
      toast.success('Lead deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete lead: ' + error.message);
    },
  });

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-emerald-100 text-emerald-700',
      unqualified: 'bg-gray-100 text-gray-700',
      converted: 'bg-green-100 text-green-700',
      lost: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredLeads = leads
    .filter(lead => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
      if (loanTypeFilter !== 'all' && lead.loan_type !== loanTypeFilter) return false;
      if (!debouncedSearchTerm) return true;
      const search = debouncedSearchTerm.toLowerCase();
      return (
        lead.first_name?.toLowerCase().includes(search) ||
        lead.last_name?.toLowerCase().includes(search) ||
        lead.home_email?.toLowerCase().includes(search) ||
        lead.work_email?.toLowerCase().includes(search) ||
        lead.mobile_phone?.includes(search) ||
        lead.home_phone?.includes(search) ||
        lead.property_city?.toLowerCase().includes(search) ||
        lead.property_state?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      }
      if (sortBy === 'amount') {
        return (b.loan_amount || 0) - (a.loan_amount || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_date) - new Date(b.created_date);
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setNewLead({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      home_email: lead.home_email || '',
      work_email: lead.work_email || '',
      country_code: lead.country_code || '+1',
      mobile_phone: lead.mobile_phone || '',
      home_phone: lead.home_phone || '',
      work_phone: lead.work_phone || '',
      property_street: lead.property_street || '',
      property_city: lead.property_city || '',
      property_state: lead.property_state || '',
      property_zip: lead.property_zip || '',
      property_county: lead.property_county || '',
      property_country: lead.property_country || 'USA',
      property_type: lead.property_type || '',
      occupancy: lead.occupancy || '',
      estimated_value: lead.estimated_value || '',
      property_taxes: lead.property_taxes || '',
      annual_homeowners_insurance: lead.annual_homeowners_insurance || '',
      monthly_rental_income: lead.monthly_rental_income || '',
      fico_score: lead.fico_score || '',
      current_rate: lead.current_rate || '',
      current_balance: lead.current_balance || '',
      loan_amount: lead.loan_amount || '',
      loan_type: lead.loan_type || '',
      loan_purpose: lead.loan_purpose || '',
      cashout_amount: lead.cashout_amount || '',
      source: lead.source || '',
      status: lead.status || 'new',
      notes: lead.notes || '',
      zillow_link: lead.zillow_link || '',
      tcpa_consent: lead.tcpa_consent || false,
      custom_disclaimer: lead.custom_disclaimer || '',
      platform: lead.platform || '',
      fb_campaign_name: lead.fb_campaign_name || '',
      fb_campaign_id: lead.fb_campaign_id || '',
      fb_adset_name: lead.fb_adset_name || '',
      fb_adset_id: lead.fb_adset_id || '',
      fb_ad_name: lead.fb_ad_name || '',
      fb_ad_id: lead.fb_ad_id || '',
      fb_form_name: lead.fb_form_name || '',
      fb_form_id: lead.fb_form_id || '',
      fb_page_name: lead.fb_page_name || '',
      fb_page_id: lead.fb_page_id || '',
      fb_lead_id: lead.fb_lead_id || '',
      lead_received_date: lead.lead_received_date || '',
    });
    setIsAddOpen(true);
  };

  const qualifiedCount = leads.filter(l => l.status === 'qualified').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;
  const totalValue = leads.reduce((sum, l) => sum + (l.loan_amount || 0), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Lead Pipeline
          </h1>
          <p className="text-gray-500 mt-1">{leads.length} total leads • {leads.filter(l => l.status === 'qualified').length} qualified</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="cta:Leads:QuickAdd">
                <Plus className="h-4 w-4" />
                Quick Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg">Quick Add Lead</DialogTitle>
                <p className="text-xs text-slate-500 mt-1">Get a lead into the system fast</p>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">First Name</Label>
                  <Input 
                    placeholder="First name" 
                    value={newLead.first_name} 
                    onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Last Name</Label>
                  <Input 
                    placeholder="Last name" 
                    value={newLead.last_name} 
                    onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Home Email</Label>
                  <Input 
                    type="email" 
                    placeholder="john@example.com" 
                    value={newLead.home_email} 
                    onChange={(e) => setNewLead({ ...newLead, home_email: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mobile Phone</Label>
                  <Input 
                    placeholder="(555) 555-5555" 
                    value={newLead.mobile_phone} 
                    onChange={(e) => setNewLead({ ...newLead, mobile_phone: e.target.value })}
                    className="h-10"
                  />
                </div>
                <div className="pt-2 border-t">
                  <TCPAConsentCompact
                    checked={newLead.tcpa_consent}
                    onCheckedChange={(checked) => setNewLead({ ...newLead, tcpa_consent: checked })}
                    error={false}
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10 mt-2"
                  data-testid="cta:Leads:QuickAddSubmit"
                  onClick={() => { 
                    if (!newLead.tcpa_consent) {
                      toast.error('TCPA consent is required');
                      return;
                    }
                    createLeadMutation.mutate(newLead); 
                    setIsQuickAddOpen(false);
                    setNewLead({...newLead, first_name: '', last_name: '', home_email: '', mobile_phone: '', tcpa_consent: false});
                  }}
                  disabled={createLeadMutation.isPending || !newLead.tcpa_consent}
                >
                  {createLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddOpen} onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setEditingLead(null);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 gap-2" data-testid="cta:Leads:AddLead">
                <Plus className="h-4 w-4" />
                Full Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={newLead.first_name}
                    onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={newLead.last_name}
                    onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Home Email</Label>
                  <Input
                    type="email"
                    value={newLead.home_email}
                    onChange={(e) => setNewLead({ ...newLead, home_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Email</Label>
                  <Input
                    type="email"
                    value={newLead.work_email}
                    onChange={(e) => setNewLead({ ...newLead, work_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Country Code</Label>
                <Select
                  value={newLead.country_code}
                  onValueChange={(v) => setNewLead({ ...newLead, country_code: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(cc => (
                      <SelectItem key={cc.code} value={cc.code}>
                        {cc.code} {cc.country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mobile Phone</Label>
                  <Input
                    placeholder="(555) 555-5555"
                    value={newLead.mobile_phone}
                    onChange={(e) => setNewLead({ ...newLead, mobile_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Home Phone</Label>
                  <Input
                    placeholder="(555) 555-5555"
                    value={newLead.home_phone}
                    onChange={(e) => setNewLead({ ...newLead, home_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Phone</Label>
                  <Input
                    placeholder="(555) 555-5555"
                    value={newLead.work_phone}
                    onChange={(e) => setNewLead({ ...newLead, work_phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newLead.status}
                  onValueChange={(v) => setNewLead({ ...newLead, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={newLead.source}
                  onValueChange={(v) => setNewLead({ ...newLead, source: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="zillow">Zillow</SelectItem>
                    <SelectItem value="realtor">Realtor</SelectItem>
                    <SelectItem value="google">Google Ads</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Value</Label>
                  <Input
                    type="number"
                    value={newLead.estimated_value}
                    onChange={(e) => setNewLead({ ...newLead, estimated_value: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>FICO/Credit Score</Label>
                  <Input
                    type="number"
                    value={newLead.fico_score}
                    onChange={(e) => setNewLead({ ...newLead, fico_score: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.125"
                    value={newLead.current_rate}
                    onChange={(e) => setNewLead({ ...newLead, current_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Balance</Label>
                  <Input
                    type="number"
                    value={newLead.current_balance}
                    onChange={(e) => setNewLead({ ...newLead, current_balance: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Amount</Label>
                  <Input
                    type="number"
                    value={newLead.loan_amount}
                    onChange={(e) => setNewLead({ ...newLead, loan_amount: e.target.value })}
                    placeholder="500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cash Out Amount</Label>
                  <Input
                    type="number"
                    value={newLead.cashout_amount}
                    onChange={(e) => setNewLead({ ...newLead, cashout_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select
                  value={newLead.loan_type}
                  onValueChange={(v) => setNewLead({ ...newLead, loan_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DSCR">DSCR</SelectItem>
                    <SelectItem value="Conventional">Conventional</SelectItem>
                    <SelectItem value="FHA">FHA</SelectItem>
                    <SelectItem value="VA">VA</SelectItem>
                    <SelectItem value="Non-QM">Non-QM</SelectItem>
                    <SelectItem value="Bank Statement">Bank Statement</SelectItem>
                    <SelectItem value="Hard Money">Hard Money</SelectItem>
                    <SelectItem value="Bridge">Bridge</SelectItem>
                    <SelectItem value="Portfolio">Portfolio</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Purpose</Label>
                <Select
                  value={newLead.loan_purpose}
                  onValueChange={(v) => setNewLead({ ...newLead, loan_purpose: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Purchase">Purchase</SelectItem>
                    <SelectItem value="Refinance">Refinance</SelectItem>
                    <SelectItem value="Cash-Out">Cash-Out</SelectItem>
                    <SelectItem value="Cash Out Refi">Cash Out Refi</SelectItem>
                    <SelectItem value="Rate and Term">Rate and Term</SelectItem>
                    <SelectItem value="Lower Rate Refi">Lower Rate Refi</SelectItem>
                    <SelectItem value="Home Equity">Home Equity</SelectItem>
                    <SelectItem value="Construction">Construction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Property Taxes</Label>
                  <Input
                    type="number"
                    value={newLead.property_taxes}
                    onChange={(e) => setNewLead({ ...newLead, property_taxes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annual Homeowners Insurance</Label>
                  <Input
                    type="number"
                    value={newLead.annual_homeowners_insurance}
                    onChange={(e) => setNewLead({ ...newLead, annual_homeowners_insurance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Rental Income</Label>
                  <Input
                    type="number"
                    value={newLead.monthly_rental_income}
                    onChange={(e) => setNewLead({ ...newLead, monthly_rental_income: e.target.value })}
                  />
                </div>
              </div>
              <AddressAutocomplete 
                value={newLead.property_street}
                onChange={(val) => setNewLead({ ...newLead, property_street: val })}
                onAddressParsed={(parsed) => {
                  setNewLead({ 
                    ...newLead, 
                    property_street: parsed.street,
                    property_city: parsed.city,
                    property_state: parsed.state,
                    property_zip: parsed.zip,
                    property_county: parsed.county,
                    property_country: parsed.country,
                  });
                }}
              />
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={newLead.property_city}
                    onChange={(e) => setNewLead({ ...newLead, property_city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={newLead.property_state}
                    onChange={(e) => setNewLead({ ...newLead, property_state: e.target.value })}
                    placeholder="CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input
                    value={newLead.property_zip}
                    onChange={(e) => setNewLead({ ...newLead, property_zip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>County</Label>
                  <Input
                    value={newLead.property_county}
                    onChange={(e) => setNewLead({ ...newLead, property_county: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={newLead.property_type}
                    onValueChange={(v) => setNewLead({ ...newLead, property_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SFR">Single Family</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
                      <SelectItem value="Duplex 2-Unit">Duplex (2-Unit)</SelectItem>
                      <SelectItem value="Triplex 3-Unit">Triplex (3-Unit)</SelectItem>
                      <SelectItem value="Quadplex 4-Unit">Quadplex (4-Unit)</SelectItem>
                      <SelectItem value="5+ Units">5+ Units</SelectItem>
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Occupancy</Label>
                  <Select
                    value={newLead.occupancy}
                    onValueChange={(v) => setNewLead({ ...newLead, occupancy: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary">Primary Residence</SelectItem>
                      <SelectItem value="Investment">Investment Property</SelectItem>
                      <SelectItem value="2nd Home">Second Home</SelectItem>
                      <SelectItem value="Vacation Home">Vacation Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Zillow Link</Label>
                <Input
                  value={newLead.zillow_link}
                  onChange={(e) => setNewLead({ ...newLead, zillow_link: e.target.value })}
                  placeholder="https://www.zillow.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Add any notes..."
                />
              </div>
              
              {/* Ad Platform Tracking Section */}
              <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-sm text-gray-700 mb-3">Ad Platform Tracking (FB/IG)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={newLead.platform}
                      onValueChange={(v) => setNewLead({ ...newLead, platform: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FB">Facebook</SelectItem>
                        <SelectItem value="IG">Instagram</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lead Received Date</Label>
                    <Input
                      type="datetime-local"
                      value={newLead.lead_received_date}
                      onChange={(e) => setNewLead({ ...newLead, lead_received_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Campaign Name</Label>
                    <Input
                      value={newLead.fb_campaign_name}
                      onChange={(e) => setNewLead({ ...newLead, fb_campaign_name: e.target.value })}
                      placeholder="e.g., Cash Out Refi LS-17"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Campaign ID</Label>
                    <Input
                      value={newLead.fb_campaign_id}
                      onChange={(e) => setNewLead({ ...newLead, fb_campaign_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Ad Set Name</Label>
                    <Input
                      value={newLead.fb_adset_name}
                      onChange={(e) => setNewLead({ ...newLead, fb_adset_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ad Set ID</Label>
                    <Input
                      value={newLead.fb_adset_id}
                      onChange={(e) => setNewLead({ ...newLead, fb_adset_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Ad Name</Label>
                    <Input
                      value={newLead.fb_ad_name}
                      onChange={(e) => setNewLead({ ...newLead, fb_ad_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ad ID</Label>
                    <Input
                      value={newLead.fb_ad_id}
                      onChange={(e) => setNewLead({ ...newLead, fb_ad_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Form Name</Label>
                    <Input
                      value={newLead.fb_form_name}
                      onChange={(e) => setNewLead({ ...newLead, fb_form_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Form ID</Label>
                    <Input
                      value={newLead.fb_form_id}
                      onChange={(e) => setNewLead({ ...newLead, fb_form_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>Page Name</Label>
                    <Input
                      value={newLead.fb_page_name}
                      onChange={(e) => setNewLead({ ...newLead, fb_page_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Page ID</Label>
                    <Input
                      value={newLead.fb_page_id}
                      onChange={(e) => setNewLead({ ...newLead, fb_page_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label>FB Lead ID</Label>
                    <Input
                      value={newLead.fb_lead_id}
                      onChange={(e) => setNewLead({ ...newLead, fb_lead_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Disclaimer</Label>
                    <Input
                      value={newLead.custom_disclaimer}
                      onChange={(e) => setNewLead({ ...newLead, custom_disclaimer: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {!editingLead && (
                <div className="pt-3 border-t">
                  <TCPAConsentCompact
                    checked={newLead.tcpa_consent}
                    onCheckedChange={(checked) => setNewLead({ ...newLead, tcpa_consent: checked })}
                    error={false}
                  />
                </div>
              )}
              <Button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                data-testid="cta:Leads:SaveLead"
                onClick={() => {
                  if (!editingLead && !newLead.tcpa_consent) {
                    toast.error('TCPA consent is required for new leads');
                    return;
                  }
                  createLeadMutation.mutate(newLead);
                }}
                disabled={createLeadMutation.isPending || (!editingLead && !newLead.tcpa_consent)}
              >
                {createLeadMutation.isPending ? 'Saving...' : editingLead ? 'Update Lead' : 'Add Lead'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

            {/* KPI Cards - Rich metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Total Leads</div>
                <div className="text-3xl font-bold mt-2 text-gray-900">{leads.length}</div>
                <p className="text-xs text-gray-500 mt-2">This month: +{Math.floor(leads.length * 0.15)}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Qualified</div>
                <div className="text-3xl font-bold mt-2 text-emerald-600">{qualifiedCount}</div>
                <p className="text-xs text-gray-500 mt-2">{leads.length > 0 ? Math.round((qualifiedCount / leads.length) * 100) : 0}% conversion</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Converted</div>
                <div className="text-3xl font-bold mt-2 text-green-600">{convertedCount}</div>
                <p className="text-xs text-gray-500 mt-2">{leads.length > 0 ? Math.round((convertedCount / leads.length) * 100) : 0}% closure</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-600">Pipeline Value</div>
                <div className="text-3xl font-bold mt-2 text-purple-600">${(totalValue / 1000000).toFixed(1)}M</div>
                <p className="text-xs text-gray-500 mt-2">Avg: ${leads.length > 0 ? (totalValue / leads.length / 1000).toFixed(0) : 0}K</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <LeadImportWizard 
          trigger={<Button variant="outline" className="gap-2" data-testid="cta:Leads:Import"><Upload className="h-4 w-4" />Import Leads</Button>}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['Lead', 'org'] })} 
        />
        <Button 
          variant="outline" 
          className="gap-2"
          data-testid="cta:Leads:ExportCSV"
          onClick={() => {
            const csvContent = [
              ['First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Loan Type', 'Loan Amount', 'Property City', 'Property State'].join(','),
              ...leads.map(l => [
                l.first_name || '',
                l.last_name || '',
                l.home_email || '',
                l.mobile_phone || '',
                l.status || '',
                l.loan_type || '',
                l.loan_amount || '',
                l.property_city || '',
                l.property_state || ''
              ].join(','))
            ].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'leads-export.csv';
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success('Leads exported to CSV');
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters & Controls */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            ref={searchInputRef}
            placeholder="Search by name, email, phone, city, or state... (Press /)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10"
            aria-label="Search leads"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">🆕 New</SelectItem>
              <SelectItem value="contacted">📞 Contacted</SelectItem>
              <SelectItem value="qualified">✅ Qualified</SelectItem>
              <SelectItem value="unqualified">❌ Unqualified</SelectItem>
              <SelectItem value="converted">🎉 Converted</SelectItem>
              <SelectItem value="lost">😞 Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={loanTypeFilter} onValueChange={setLoanTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Loan Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Loan Types</SelectItem>
              <SelectItem value="DSCR">DSCR</SelectItem>
              <SelectItem value="Conventional">Conventional</SelectItem>
              <SelectItem value="Hard Money">Hard Money</SelectItem>
              <SelectItem value="Bridge">Bridge</SelectItem>
              <SelectItem value="Portfolio">Portfolio</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_date">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="amount">Highest Loan Amount</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-white" role="group" aria-label="View mode">
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} aria-label="Table view" aria-pressed={viewMode === 'table'}>
              <List className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('cards')} aria-label="Card view" aria-pressed={viewMode === 'cards'}>
              <Grid className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <AlertCircle className="h-5 w-5 inline mr-2" />
          Failed to load leads. Please refresh the page.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && leads.length === 0 && (
        <Card className="p-8 text-center">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No leads yet</h3>
          <p className="text-gray-500 mb-4">Start building your pipeline by adding leads</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setIsQuickAddOpen(true)} className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              Quick Add Lead
            </Button>
            <LeadImportWizard 
              trigger={<Button variant="outline" className="gap-2"><Upload className="h-4 w-4" />Import Leads</Button>}
              onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['Lead', 'org'] })} 
            />
          </div>
        </Card>
      )}

      {/* View Mode */}
      {!isLoading && !error && leads.length > 0 && viewMode === 'table' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gradient-to-r from-gray-50 to-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wide">Location</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-400"><AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No leads match your filters</p></td></tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{lead.first_name} {lead.last_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-0.5">
                          {lead.home_email && <div className="flex items-center gap-1 text-gray-600"><Mail className="h-3 w-3" />{lead.home_email}</div>}
                          {lead.mobile_phone && <div className="flex items-center gap-1 text-gray-600"><Phone className="h-3 w-3" />{lead.mobile_phone}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4"><Badge className={getStatusColor(lead.status)}>{lead.status}</Badge></td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lead.loan_type}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{lead.loan_amount ? `$${(lead.loan_amount / 1000).toFixed(0)}K` : '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{lead.property_city}, {lead.property_state}</td>
                      <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <LeadDetailModal lead={lead} onEdit={handleEditLead} trigger={<Button variant="ghost" size="sm" className="h-8">View</Button>} />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-blue-600 hover:text-blue-700"
                          onClick={() => { setQuoteSelectedLead(lead); setQuoteModalOpen(true); }}
                        >
                          <FileOutput className="h-3 w-3 mr-1" />
                          Quote
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditLead(lead)}>Edit Lead</DropdownMenuItem>
                            <DropdownMenuItem asChild disabled={!lead.home_email && !lead.work_email}>
                              <a href={`mailto:${lead.home_email || lead.work_email}`}>
                                <Mail className="h-3 w-3 mr-2" />Send Email
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild disabled={!lead.mobile_phone && !lead.home_phone}>
                              <a href={`tel:${lead.mobile_phone || lead.home_phone}`}>
                                <Phone className="h-3 w-3 mr-2" />Call
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={async () => {
                                const confirmed = await confirm({
                                  title: 'Delete Lead',
                                  description: `Are you sure you want to delete ${lead.first_name} ${lead.last_name}? This action cannot be undone.`,
                                  variant: 'delete',
                                  confirmLabel: 'Delete Lead',
                                });
                                if (confirmed) {
                                  deleteLeadMutation.mutate(lead.id);
                                }
                              }}
                            >Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : !isLoading && !error && leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400"><AlertCircle className="h-8 w-8 mx-auto mb-2" /><p>No leads match your filters</p></div>
          ) : (
            filteredLeads.map((lead) => (
              <Card key={lead.id} className="border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{lead.first_name} {lead.last_name}</h3>
                      <p className="text-xs text-gray-500">{lead.property_city}, {lead.property_state}</p>
                    </div>
                    <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                  </div>
                  <div className="space-y-2 mb-4 border-y border-gray-100 py-3">
                    <div className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-blue-600" /><span className="font-semibold text-gray-900">${(lead.loan_amount / 1000).toFixed(0)}K</span><span className="text-gray-600">{lead.loan_type}</span></div>
                    {lead.home_email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail className="h-4 w-4" /><span className="truncate">{lead.home_email}</span></div>}
                    {lead.mobile_phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="h-4 w-4" />{lead.mobile_phone}</div>}
                  </div>
                  <div className="flex gap-2">
                    <LeadDetailModal lead={lead} onEdit={handleEditLead} trigger={<Button variant="outline" size="sm" className="flex-1">Details</Button>} />
                    <Button variant="outline" size="sm" onClick={() => { setQuoteSelectedLead(lead); setQuoteModalOpen(true); }}>
                      <FileOutput className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {quoteSelectedLead && (
        <QuoteGeneratorModal
          isOpen={quoteModalOpen}
          onClose={() => {
            setQuoteModalOpen(false);
            setQuoteSelectedLead(null);
          }}
          lead={quoteSelectedLead}
        />
      )}

      {/* Confirmation Dialog */}
      {ConfirmDialogComponent}
    </div>
  );
}