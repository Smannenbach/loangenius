import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from 'lucide-react';
import QuoteGeneratorModal from '@/components/QuoteGeneratorModal';

export default function Leads() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteSelectedLead, setQuoteSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    home_email: '',
    work_email: '',
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
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.filter({ is_deleted: false }),
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const processedData = {
        ...data,
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
      if (editingLead) {
        return base44.entities.Lead.update(editingLead.id, processedData);
      }
      return base44.entities.Lead.create({
        ...processedData,
        org_id: user.org_id || 'default',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsAddOpen(false);
      setEditingLead(null);
      setNewLead({
        first_name: '',
        last_name: '',
        home_email: '',
        work_email: '',
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
      });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id) => base44.entities.Lead.update(id, { is_deleted: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
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
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        lead.first_name?.toLowerCase().includes(search) ||
        lead.last_name?.toLowerCase().includes(search) ||
        lead.email?.toLowerCase().includes(search) ||
        lead.phone?.includes(search)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      }
      if (sortBy === 'amount') {
        return (b.estimated_loan_amount || 0) - (a.estimated_loan_amount || 0);
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
    });
    setIsAddOpen(true);
  };

  const qualifiedCount = leads.filter(l => l.status === 'qualified').length;
  const convertedCount = leads.filter(l => l.status === 'converted').length;
  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_loan_amount || 0), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">Manage and convert your leads</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setEditingLead(null);
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <UserPlus className="h-4 w-4" />
              New Lead
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
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mobile Phone</Label>
                  <Input
                    value={newLead.mobile_phone}
                    onChange={(e) => setNewLead({ ...newLead, mobile_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Home Phone</Label>
                  <Input
                    value={newLead.home_phone}
                    onChange={(e) => setNewLead({ ...newLead, home_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Work Phone</Label>
                  <Input
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
                      <SelectItem value="Rate and Term">Rate and Term</SelectItem>
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
              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input
                  value={newLead.property_street}
                  onChange={(e) => setNewLead({ ...newLead, property_street: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
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
                      <SelectItem value="Multi-Family">Multi-Family</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Land">Land</SelectItem>
                      <SelectItem value="Condo">Condo</SelectItem>
                      <SelectItem value="Townhouse">Townhouse</SelectItem>
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
                      <SelectItem value="Primary Residence">Primary Residence</SelectItem>
                      <SelectItem value="Investment Property">Investment Property</SelectItem>
                      <SelectItem value="Second Home">Second Home</SelectItem>
                      <SelectItem value="Vacation Home">Vacation Home</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Add any notes..."
                />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-500"
                onClick={() => createLeadMutation.mutate(newLead)}
                disabled={createLeadMutation.isPending}
              >
                {createLeadMutation.isPending ? 'Saving...' : editingLead ? 'Update Lead' : 'Add Lead'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Total Leads</div>
            <div className="text-2xl font-bold mt-1">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Qualified</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{qualifiedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Converted</div>
            <div className="text-2xl font-bold mt-1 text-green-600">{convertedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Pipeline Value</div>
            <div className="text-2xl font-bold mt-1">${(totalValue / 1000000).toFixed(1)}M</div>
          </CardContent>
        </Card>
      </div>

      {/* Google Sheets Sync */}
      <div className="mb-6">
        <Button variant="outline" className="gap-2" onClick={() => alert('Sync with Google Sheets coming soon')}>
          <Sheet className="h-4 w-4" />
          Sync with Google Sheets
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_date">Newest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="amount">Loan Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loan Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loan Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">State</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    No leads found
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {lead.loan_type_interest?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {lead.estimated_loan_amount ? `$${(lead.estimated_loan_amount / 1000).toFixed(0)}K` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {lead.source}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lead.property_state}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4 text-gray-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem 
                             onClick={() => {
                               setQuoteSelectedLead(lead);
                               setQuoteModalOpen(true);
                             }}
                           >
                             <FileOutput className="h-3 w-3 mr-2" />
                             Generate Quote
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => handleEditLead(lead)}>
                             Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem 
                             className="text-red-600"
                             onClick={() => deleteLeadMutation.mutate(lead.id)}
                           >
                             Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}