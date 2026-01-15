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
import { Search, Plus, DollarSign, TrendingUp, Calendar, ChevronRight, Edit2, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LoansPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: deals = [] } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.filter({ is_deleted: false }),
  });

  const updateLoanMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.update(data.id, data.changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      setIsEditOpen(false);
    },
  });

  const getStatusColor = (status) => {
    const colors = {
      inquiry: 'bg-gray-100 text-gray-800',
      application: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      underwriting: 'bg-purple-100 text-purple-800',
      approved: 'bg-orange-100 text-orange-800',
      closing: 'bg-teal-100 text-teal-800',
      funded: 'bg-emerald-100 text-emerald-800',
      denied: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredLoans = deals
    .filter(loan => {
      if (statusFilter !== 'all' && loan.stage !== statusFilter) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        loan.deal_number?.toLowerCase().includes(search) ||
        loan.primary_borrower_id?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const totalPipeline = filteredLoans.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
  const fundedAmount = filteredLoans
    .filter(l => l.stage === 'funded')
    .reduce((sum, l) => sum + (l.loan_amount || 0), 0);
  const avgLTV = filteredLoans.length > 0 
    ? (filteredLoans.reduce((sum, l) => sum + (l.ltv || 0), 0) / filteredLoans.length).toFixed(1)
    : 0;

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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Total Pipeline</div>
              <div className="text-2xl font-bold mt-1">${(totalPipeline / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-gray-400 mt-1">{filteredLoans.length} loans</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Funded</div>
              <div className="text-2xl font-bold mt-1 text-green-600">${(fundedAmount / 1000000).toFixed(1)}M</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Avg LTV</div>
              <div className="text-2xl font-bold mt-1">{avgLTV}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Active Deals</div>
              <div className="text-2xl font-bold mt-1 text-blue-600">
                {filteredLoans.filter(l => ['underwriting', 'processing', 'closing'].includes(l.stage)).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by loan number, borrower, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="inquiry">Inquiry</SelectItem>
              <SelectItem value="application">Application</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="underwriting">Underwriting</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="closing">Closing</SelectItem>
              <SelectItem value="funded">Funded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loan #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loan Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">LTV / DSCR</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Close Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No loans found
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr 
                      key={loan.id} 
                      className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedLoan(loan)}
                    >
                      <td className="px-6 py-4 font-medium text-blue-600 hover:underline">
                        {loan.deal_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {loan.loan_product?.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        ${(loan.loan_amount / 1000).toFixed(0)}K
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(loan.stage)}>
                          {loan.stage?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span>{loan.ltv?.toFixed(1) || '-'}% LTV</span>
                          <span className="text-gray-400">•</span>
                          <span>{loan.dscr?.toFixed(2) || '-'} DSCR</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {loan.interest_rate ? `${loan.interest_rate}%` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {loan.closing_date ? new Date(loan.closing_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = createPageUrl(`DealDetail?id=${loan.id}`);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoan(loan);
                              setIsEditOpen(true);
                            }}>
                              Edit
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
      </div>

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <Dialog open={!!selectedLoan} onOpenChange={(open) => {
          if (!open) setSelectedLoan(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedLoan.deal_number} - {selectedLoan.loan_product}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Loan Amount</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    ${(selectedLoan.loan_amount / 1000).toFixed(0)}K
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedLoan.stage)}>
                      {selectedLoan.stage?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Interest Rate</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedLoan.interest_rate}%
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Loan Term</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {selectedLoan.loan_term_months} months
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">LTV</Label>
                  <div className="text-lg font-semibold mt-1">{selectedLoan.ltv?.toFixed(1)}%</div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">DSCR</Label>
                  <div className="text-lg font-semibold mt-1">{selectedLoan.dscr?.toFixed(2)}</div>
                </div>
              </div>

              <Button 
                onClick={() => setIsEditOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-500"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Loan
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Loan Modal */}
      {isEditOpen && selectedLoan && (
        <LoanEditDialog 
          loan={selectedLoan}
          onClose={() => setIsEditOpen(false)}
          onSave={(changes) => {
            updateLoanMutation.mutate({ id: selectedLoan.id, changes });
          }}
          isPending={updateLoanMutation.isPending}
        />
      )}
    </div>
  );
}

function LoanEditDialog({ loan, onClose, onSave, isPending }) {
  const [data, setData] = useState({
    interest_rate: loan.interest_rate || '',
    loan_term_months: loan.loan_term_months || '',
    stage: loan.stage || '',
    status: loan.status || '',
  });

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Loan - {loan.deal_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Interest Rate (%)</Label>
            <Input
              type="number"
              step="0.125"
              value={data.interest_rate}
              onChange={(e) => setData({ ...data, interest_rate: parseFloat(e.target.value) })}
            />
          </div>
          <div>
            <Label>Loan Term (Months)</Label>
            <Input
              type="number"
              value={data.loan_term_months}
              onChange={(e) => setData({ ...data, loan_term_months: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label>Stage</Label>
            <Select value={data.stage} onValueChange={(v) => setData({ ...data, stage: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="underwriting">Underwriting</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-500"
              onClick={() => onSave(data)}
              disabled={isPending}
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}