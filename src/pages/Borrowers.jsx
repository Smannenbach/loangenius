import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  User,
  Building2,
  Phone,
  Mail,
  MoreVertical,
  CreditCard,
} from 'lucide-react';

export default function Borrowers() {
  const [searchTerm, setSearchTerm] = useState('');

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
        <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
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
    </div>
  );
}