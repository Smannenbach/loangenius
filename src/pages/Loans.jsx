import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // TODO: Replace with actual data from base44.entities.Deal.list()
  const loans = [
    {
      id: 'LOAN-001',
      dealNumber: 'DL-2024-001',
      borrowerName: 'John Smith',
      loanAmount: 500000,
      loanType: 'DSCR Purchase',
      status: 'underwriting',
      ltv: 75,
      dscr: 1.25,
      closeDate: '2026-02-15',
    },
    {
      id: 'LOAN-002',
      dealNumber: 'DL-2024-002',
      borrowerName: 'Sarah Johnson',
      loanAmount: 750000,
      loanType: 'Fix & Flip',
      status: 'processing',
      ltv: 70,
      dscr: 1.35,
      closeDate: '2026-03-01',
    },
  ];

  const getStatusColor = (status) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-800',
      application: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      underwriting: 'bg-purple-100 text-purple-800',
      conditional_approval: 'bg-orange-100 text-orange-800',
      clear_to_close: 'bg-green-100 text-green-800',
      funded: 'bg-emerald-100 text-emerald-800',
      denied: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
            <p className="text-gray-500 mt-2">Manage all active and closed loans</p>
          </div>
          <Link to={createPageUrl('NewDeal')}>
            <Button className="bg-blue-600 hover:bg-blue-500">
              <Plus className="h-4 w-4 mr-2" />
              New Loan
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by borrower name, loan number, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loans Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Loan #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Borrower</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Loan Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">LTV / DSCR</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Close Date</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={createPageUrl(`DealDetail?id=${loan.id}`)} className="text-blue-600 font-medium hover:underline">
                      {loan.dealNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{loan.borrowerName}</td>
                  <td className="px-6 py-4 text-gray-900">{loan.loanType}</td>
                  <td className="px-6 py-4 text-gray-900 font-medium">${(loan.loanAmount / 1000).toFixed(0)}K</td>
                  <td className="px-6 py-4">
                    <Badge className={getStatusColor(loan.status)}>
                      {loan.status.replace(/_/g, ' ').charAt(0).toUpperCase() + loan.status.slice(1).replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-900 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{loan.ltv}% LTV</span>
                      <span className="text-gray-400">•</span>
                      <span>{loan.dscr} DSCR</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 text-sm">{new Date(loan.closeDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TODO Sections */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Total Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$2.5M</p>
              <p className="text-sm text-gray-500 mt-1">Across 2 active loans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Avg LTV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">72.5%</p>
              <p className="text-sm text-gray-500 mt-1">Within target range</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-purple-600" />
                Next Close
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Feb 15</p>
              <p className="text-sm text-gray-500 mt-1">DL-2024-001</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}