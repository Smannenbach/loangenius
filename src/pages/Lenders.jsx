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
  Building2,
  Plus,
  Search,
  Globe,
  Phone,
  Star,
  MapPin,
  DollarSign,
} from 'lucide-react';

export default function Lenders() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLender, setNewLender] = useState({
    name: '',
    type: '',
    minLoan: '',
    maxLoan: '',
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
      setNewLender({ name: '', type: '', minLoan: '', maxLoan: '' });
    },
  });

  const filteredLenders = lenders.filter(lender => {
    if (!searchTerm) return true;
    return (
      lender.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lender.programs.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Building2 className="h-7 w-7 text-blue-600" />
            Lender Management
          </h1>
          <p className="text-gray-500 mt-1">Manage your lending partners and programs</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              Add Lender
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lender</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={newLender.name}
                  onChange={(e) => setNewLender({...newLender, name: e.target.value})}
                  placeholder="Lender Name"
                />
              </div>
              <div>
                <Label>Lender Type</Label>
                <Input
                  value={newLender.type}
                  onChange={(e) => setNewLender({...newLender, type: e.target.value})}
                  placeholder="e.g., Non-QM, Bank, Hard Money"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Loan Amount</Label>
                  <Input
                    type="number"
                    value={newLender.minLoan}
                    onChange={(e) => setNewLender({...newLender, minLoan: e.target.value})}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label>Max Loan Amount</Label>
                  <Input
                    type="number"
                    value={newLender.maxLoan}
                    onChange={(e) => setNewLender({...newLender, maxLoan: e.target.value})}
                    placeholder="5000000"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => addLenderMutation.mutate(newLender)}
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
      <Card className="border-gray-200 mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search lenders or programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lenders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLenders.length === 0 ? (
          <Card className="col-span-full border-gray-200">
            <CardContent className="py-12 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No lenders yet</p>
            </CardContent>
          </Card>
        ) : (
          filteredLenders.map((lender) => (
            <Card key={lender.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{lender.name || lender.company_name}</h3>
                <p className="text-sm text-gray-500 mb-3">{lender.type || 'Lending Partner'}</p>

                {lender.minLoan && lender.maxLoan && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>${(parseFloat(lender.minLoan) / 1000).toFixed(0)}K - ${(parseFloat(lender.maxLoan) / 1000000).toFixed(1)}M</span>
                    </div>
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