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
  User,
  Building2,
  Phone,
  Mail,
  MoreVertical,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Borrowers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newBorrower, setNewBorrower] = useState({
    borrower_type: 'individual',
    first_name: '',
    last_name: '',
    email: '',
    cell_phone: ''
  });
  const queryClient = useQueryClient();

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

  const orgId = memberships[0]?.org_id || user?.org_id || 'default';

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Borrower.create({
        ...data,
        org_id: orgId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['borrowers']);
      setIsAddOpen(false);
      setNewBorrower({ borrower_type: 'individual', first_name: '', last_name: '', email: '', cell_phone: '' });
      toast.success('Borrower added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add borrower: ' + error.message);
    }
  });

  const { data: borrowers = [], isLoading } = useQuery({
    queryKey: ['borrowers'],
    queryFn: async () => {
      try {
        return await base44.entities.Borrower.filter({ is_deleted: false });
      } catch {
        return await base44.entities.Borrower.list();
      }
    },
  });

  const filteredBorrowers = borrowers.filter(borrower => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const name = borrower.borrower_type === 'entity' 
      ? borrower.entity_name 
      : `${borrower.first_name} ${borrower.last_name}`;
    return (
      name?.toLowerCase().includes(search) ||
      borrower.email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Borrowers</h1>
          <p className="text-gray-500 mt-1">Manage your borrower contacts</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-500 gap-2"
          onClick={() => setIsAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add Borrower
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search borrowers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Borrowers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBorrowers.length === 0 ? (
          <Card className="col-span-full border-gray-200">
            <CardContent className="py-12 text-center">
              <User className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No borrowers found</p>
              <Button 
                variant="link" 
                className="text-blue-600 mt-2"
                onClick={() => setIsAddOpen(true)}
              >
                Add your first borrower
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredBorrowers.map((borrower) => (
            <Card key={borrower.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      borrower.borrower_type === 'entity' 
                        ? 'bg-purple-100' 
                        : 'bg-blue-100'
                    }`}>
                      {borrower.borrower_type === 'entity' ? (
                        <Building2 className="h-5 w-5 text-purple-600" />
                      ) : (
                        <User className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {borrower.borrower_type === 'entity'
                          ? borrower.entity_name
                          : `${borrower.first_name} ${borrower.last_name}`
                        }
                      </h3>
                      <Badge variant="outline" className="mt-1 text-xs capitalize">
                        {borrower.borrower_type}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm">
                  {borrower.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{borrower.email}</span>
                    </div>
                  )}
                  {borrower.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{borrower.phone}</span>
                    </div>
                  )}
                  {borrower.credit_score && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <span>Credit: {borrower.credit_score}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Borrower Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Borrower</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Borrower Type</Label>
              <Select
                value={newBorrower.borrower_type}
                onValueChange={(v) => setNewBorrower({ ...newBorrower, borrower_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="entity">Entity (LLC/Corp)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newBorrower.borrower_type === 'individual' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={newBorrower.first_name}
                    onChange={(e) => setNewBorrower({ ...newBorrower, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={newBorrower.last_name}
                    onChange={(e) => setNewBorrower({ ...newBorrower, last_name: e.target.value })}
                    placeholder="Smith"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Entity Name *</Label>
                <Input
                  value={newBorrower.entity_name}
                  onChange={(e) => setNewBorrower({ ...newBorrower, entity_name: e.target.value })}
                  placeholder="ABC Holdings LLC"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newBorrower.email}
                onChange={(e) => setNewBorrower({ ...newBorrower, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={newBorrower.cell_phone}
                onChange={(e) => setNewBorrower({ ...newBorrower, cell_phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => createMutation.mutate(newBorrower)}
                disabled={createMutation.isPending || (!newBorrower.first_name && !newBorrower.entity_name)}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : 'Add Borrower'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}