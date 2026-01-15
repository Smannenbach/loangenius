import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [searchTerm, setSearchTerm] = useState('');

  // Sample lender data - in production this would come from an entity
  const lenders = [
    { 
      id: 1, 
      name: 'First Capital Lending', 
      type: 'Non-QM', 
      programs: ['DSCR', 'Bridge', 'Hard Money'], 
      rating: 4.8, 
      active: true,
      minLoan: 100000,
      maxLoan: 5000000,
      states: ['All States'],
    },
    { 
      id: 2, 
      name: 'Investment Property Lenders', 
      type: 'Non-QM', 
      programs: ['DSCR', 'Fix & Flip'], 
      rating: 4.5, 
      active: true,
      minLoan: 75000,
      maxLoan: 3000000,
      states: ['CA', 'TX', 'FL', 'NY'],
    },
    { 
      id: 3, 
      name: 'Prime Mortgage Solutions', 
      type: 'Bank', 
      programs: ['Conventional', 'Jumbo', 'FHA'], 
      rating: 4.7, 
      active: true,
      minLoan: 100000,
      maxLoan: 10000000,
      states: ['All States'],
    },
  ];

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
        <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
          <Plus className="h-4 w-4" />
          Add Lender
        </Button>
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
        {filteredLenders.map((lender) => (
          <Card key={lender.id} className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <Badge className={lender.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {lender.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{lender.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{lender.type}</p>

              <div className="flex items-center gap-1 mb-3">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-medium">{lender.rating}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span>${(lender.minLoan / 1000)}K - ${(lender.maxLoan / 1000000)}M</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{lender.states.length > 3 ? 'All States' : lender.states.join(', ')}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {lender.programs.map((program, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {program}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}