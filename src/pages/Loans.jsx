import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPICardSkeleton, TableRowSkeleton } from '@/components/LoadingSkeletons';
import ErrorBoundary from '@/components/ErrorBoundary';
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
import { Search, Plus, DollarSign, TrendingUp, Calendar, ChevronRight, Edit2, MoreVertical, MessageSquare } from 'lucide-react';
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get user's org membership
  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: deals = [], isLoading: dealsLoading, error: dealsError } = useQuery({
     queryKey: ['deals', orgId],
     queryFn: async () => {
       if (!orgId) return [];
       try {
         return await base44.entities.Deal.filter({ org_id: orgId });
       } catch (e) {
         // Fallback: get all deals if filter fails
         const allDeals = await base44.entities.Deal.list();
         return allDeals.filter(d => !d.is_deleted);
       }
     },
     enabled: !!orgId,
     retry: 2,
     staleTime: 5 * 60 * 1000, // 5 minutes
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

  const filteredLoans = useMemo(() => {
     return deals
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
   }, [deals, searchTerm, statusFilter]);

   const kpis = useMemo(() => {
     const totalPipeline = filteredLoans.reduce((sum, l) => sum + (l.loan_amount || 0), 0);
     const fundedAmount = filteredLoans
       .filter(l => l.stage === 'funded')
       .reduce((sum, l) => sum + (l.loan_amount || 0), 0);
     const avgLTV = filteredLoans.length > 0 
       ? (filteredLoans.reduce((sum, l) => sum + (l.ltv || 0), 0) / filteredLoans.length).toFixed(1)
       : 0;
     return { totalPipeline, fundedAmount, avgLTV };
   }, [filteredLoans]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Loan Portfolio</h1>
              <p className="text-slate-600 mt-2 text-lg">Comprehensive view of all loans and deal pipelines</p>
            </div>
            <Link to={createPageUrl('LoanApplicationWizard')}>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg gap-2 h-12 px-6">
                <Plus className="h-5 w-5" />
                <span className="font-semibold">New Loan</span>
              </Button>
            </Link>
          </div>

          {/* KPI Cards - Premium Layout */}
          {dealsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
              Failed to load deals. Please try refreshing.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            {dealsLoading ? (
              <>
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
                <KPICardSkeleton />
              </>
            ) : (
              <>
                {/* KPIs */}
              </>
            )}
            {!dealsLoading && (
              <>
                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total Pipeline</p>
                        <p className="text-3xl font-bold text-slate-900 mt-2">${(kpis.totalPipeline / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-slate-500 mt-2">{filteredLoans.length} active loans</p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <DollarSign className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Funded</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">${(kpis.fundedAmount / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-slate-500 mt-2">{filteredLoans.filter(l => l.stage === 'funded').length} funded</p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Avg LTV</p>
                        <p className="text-3xl font-bold text-slate-900 mt-2">{kpis.avgLTV}%</p>
                        <p className="text-xs text-slate-500 mt-2">Portfolio ratio</p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">In Progress</p>
                        <p className="text-3xl font-bold text-blue-600 mt-2">
                          {filteredLoans.filter(l => ['underwriting', 'processing', 'closing'].includes(l.stage)).length}
                        </p>
                        <p className="text-xs text-slate-500 mt-2">Active deals</p>
                      </div>
                      <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Search & Filters - Premium Layout */}
        <div className="px-4 md:px-8">
          <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search by deal number or borrower..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-11 border-slate-300 bg-white shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 border-slate-300 shadow-sm">
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

          {/* Table - Premium Data Grid */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Loan #</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Type</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Amount</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Status</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Metrics</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Rate</th>
                    <th className="px-8 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wide">Close Date</th>
                    <th className="px-8 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dealsLoading ? (
                    <>
                      <TableRowSkeleton cols={8} />
                      <TableRowSkeleton cols={8} />
                      <TableRowSkeleton cols={8} />
                    </>
                  ) : filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 md:px-8 py-12 text-center">
                        <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No loans found matching your criteria</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => (
                      <tr 
                        key={loan.id} 
                        className="hover:bg-blue-50 transition-colors cursor-pointer group"
                        onClick={() => setSelectedLoan(loan)}
                      >
                        <td className="px-8 py-4 font-bold text-blue-600 group-hover:text-blue-700">
                          {loan.deal_number}
                        </td>
                        <td className="px-8 py-4 text-sm font-medium text-slate-900 capitalize">
                          {loan.loan_product?.replace(/_/g, ' ')}
                        </td>
                        <td className="px-8 py-4 font-semibold text-slate-900">
                          ${(loan.loan_amount / 1000000).toFixed(2)}M
                        </td>
                        <td className="px-8 py-4">
                          <Badge className={getStatusColor(loan.stage)}>
                            {loan.stage?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-8 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">{loan.ltv?.toFixed(1) || '-'}%</span>
                            <span className="text-slate-300">|</span>
                            <span className="font-semibold text-slate-900">{loan.dscr?.toFixed(2) || '-'}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">LTV • DSCR</p>
                        </td>
                        <td className="px-8 py-4 text-sm font-bold text-slate-900">
                          {loan.interest_rate ? `${loan.interest_rate}%` : '-'}
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-600">
                          {loan.closing_date ? new Date(loan.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-200">
                                <MoreVertical className="h-4 w-4 text-slate-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = createPageUrl(`DealDetail?id=${loan.id}`);
                                }}
                                className="gap-2"
                              >
                                <ChevronRight className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLoan(loan);
                                setIsEditOpen(true);
                              }} className="gap-2">
                                <Edit2 className="h-4 w-4" />
                                Edit Loan
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
          </Card>
        </div>

        {/* Loan Detail Modal - Premium */}
        {selectedLoan && (
          <Dialog open={!!selectedLoan} onOpenChange={(open) => {
            if (!open) setSelectedLoan(null);
          }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                  {selectedLoan.deal_number} • {selectedLoan.loan_product}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-slate-700">Loan Amount</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        ${(selectedLoan.loan_amount / 1000000).toFixed(2)}M
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100">
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-slate-700">Status</p>
                      <div className="mt-2">
                        <Badge className={getStatusColor(selectedLoan.stage)}>
                          {selectedLoan.stage?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-slate-700">Interest Rate</p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {selectedLoan.interest_rate}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
                    <CardContent className="pt-6">
                      <p className="text-sm font-medium text-slate-700">Loan Term</p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {selectedLoan.loan_term_months} months
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 bg-slate-50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs uppercase font-bold text-slate-600 tracking-wide">LTV</p>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{selectedLoan.ltv?.toFixed(1) || '-'}%</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase font-bold text-slate-600 tracking-wide">DSCR</p>
                        <p className="text-2xl font-bold text-slate-900 mt-2">{selectedLoan.dscr?.toFixed(2) || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase font-bold text-slate-600 tracking-wide">Closing Date</p>
                        <p className="text-lg font-bold text-slate-900 mt-2">
                          {selectedLoan.closing_date ? new Date(selectedLoan.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setIsEditOpen(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-11"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Loan Details
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = createPageUrl(`DealDetail?id=${selectedLoan.id}`)}
                    className="flex-1 h-11"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Full Details
                  </Button>
                </div>
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
    </ErrorBoundary>
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