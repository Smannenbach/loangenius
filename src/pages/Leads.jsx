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
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  UserPlus,
} from 'lucide-react';

export default function Leads() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: '',
    loan_type_interest: '',
    estimated_loan_amount: '',
    property_state: '',
    notes: '',
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.filter({ is_deleted: false }),
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.Lead.create({
        ...data,
        org_id: user.org_id || 'default',
        estimated_loan_amount: data.estimated_loan_amount ? parseFloat(data.estimated_loan_amount) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsAddOpen(false);
      setNewLead({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        source: '',
        loan_type_interest: '',
        estimated_loan_amount: '',
        property_state: '',
        notes: '',
      });
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

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      lead.first_name?.toLowerCase().includes(search) ||
      lead.last_name?.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">Manage and convert your leads</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <UserPlus className="h-4 w-4" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
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
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                />
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
              <div className="space-y-2">
                <Label>Loan Type Interest</Label>
                <Select
                  value={newLead.loan_type_interest}
                  onValueChange={(v) => setNewLead({ ...newLead, loan_type_interest: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dscr_purchase">DSCR Purchase</SelectItem>
                    <SelectItem value="dscr_refi">DSCR Refinance</SelectItem>
                    <SelectItem value="dscr_cashout">DSCR Cash-Out</SelectItem>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estimated Loan Amount</Label>
                <Input
                  type="number"
                  value={newLead.estimated_loan_amount}
                  onChange={(e) => setNewLead({ ...newLead, estimated_loan_amount: e.target.value })}
                  placeholder="500000"
                />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-500"
                onClick={() => createLeadMutation.mutate(newLead)}
                disabled={createLeadMutation.isPending}
              >
                {createLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.length === 0 ? (
          <Card className="col-span-full border-gray-200">
            <CardContent className="py-12 text-center">
              <UserPlus className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No leads yet</p>
              <Button 
                variant="link" 
                className="text-blue-600"
                onClick={() => setIsAddOpen(true)}
              >
                Add your first lead
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map((lead) => (
            <Card key={lead.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </h3>
                    <Badge className={`mt-1 ${getStatusColor(lead.status)}`}>
                      {lead.status || 'new'}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm">
                  {lead.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.property_state && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{lead.property_state}</span>
                    </div>
                  )}
                </div>

                {lead.estimated_loan_amount && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Est. Amount: </span>
                    <span className="font-medium text-gray-900">
                      ${lead.estimated_loan_amount.toLocaleString()}
                    </span>
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