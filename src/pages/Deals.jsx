import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Filter,
  Download,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonTable } from '@/components/ui/skeleton-cards';
import { EmptyLoans, EmptySearchResults } from '@/components/ui/empty-states';

export default function Deals() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'n': () => navigate(createPageUrl('NewDeal')),        // New deal
    '/': () => searchInputRef.current?.focus(),           // Focus search
    'p': () => navigate(createPageUrl('Pipeline')),       // Go to pipeline
    'Escape': () => searchInputRef.current?.blur(),
  });

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

  // FIX: Use proper database filtering with pagination instead of .list() then filter
  const [page, setPage] = useState(0);
  const pageSize = 50;
  
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['deals', orgId, page],
    queryFn: async () => {
      // Always use database-level filtering - never .list() then filter in memory
      const filters = { is_deleted: false };
      if (orgId) filters.org_id = orgId;
      
      return await base44.entities.Deal.filter(
        filters,
        '-created_date', // Sort by newest first
        pageSize         // Limit results
      );
    },
    enabled: true,
  });

  const getStatusColor = (status) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-700',
      application: 'bg-blue-100 text-blue-700',
      processing: 'bg-yellow-100 text-yellow-700',
      underwriting: 'bg-purple-100 text-purple-700',
      conditional_approval: 'bg-indigo-100 text-indigo-700',
      clear_to_close: 'bg-emerald-100 text-emerald-700',
      closing: 'bg-teal-100 text-teal-700',
      funded: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchTerm || 
      deal.deal_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.loan_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || deal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deals</h1>
          <p className="text-gray-500 mt-1">View and manage all loan deals</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              // Export deals to CSV
              const csvContent = [
                ['Deal #', 'Loan Type', 'Amount', 'Status', 'LTV', 'DSCR'].join(','),
                ...deals.map(d => [
                  d.deal_number || 'Draft',
                  d.loan_type || '',
                  d.loan_amount || 0,
                  d.status || '',
                  d.ltv_ratio || '',
                  d.dscr_ratio || ''
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'deals-export.csv';
              a.click();
              window.URL.revokeObjectURL(url);
              toast.success('Deals exported to CSV');
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Link 
            to={createPageUrl('NewDeal')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-gray-200 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
              <Input
                ref={searchInputRef}
                placeholder="Search deals... (Press /)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search deals"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="application">Application</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="underwriting">Underwriting</SelectItem>
                <SelectItem value="conditional_approval">Conditional</SelectItem>
                <SelectItem value="clear_to_close">Clear to Close</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
                <SelectItem value="funded">Funded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <SkeletonTable rows={8} cols={8} />
          ) : deals.length === 0 ? (
            <EmptyLoans onAction={() => window.location.href = createPageUrl('NewDeal')} />
          ) : filteredDeals.length === 0 ? (
            <EmptySearchResults
              query={searchTerm || statusFilter}
              onClear={() => { setSearchTerm(''); setStatusFilter('all'); }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Deal #</TableHead>
                  <TableHead>Loan Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead>DSCR</TableHead>
                  <TableHead>Est. Close</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {deal.deal_number || 'Draft'}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {deal.loan_type?.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      ${(deal.loan_amount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(deal.status)}>
                        {deal.status?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {deal.ltv ? `${deal.ltv.toFixed(1)}%` : (deal.ltv_ratio ? `${deal.ltv_ratio.toFixed(1)}%` : '-')}
                    </TableCell>
                    <TableCell>
                      {deal.dscr ? deal.dscr.toFixed(2) : (deal.dscr_ratio ? deal.dscr_ratio.toFixed(2) : '-')}
                    </TableCell>
                    <TableCell>
                      {deal.estimated_close_date 
                        ? new Date(deal.estimated_close_date).toLocaleDateString()
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Link 
                        to={createPageUrl(`DealDetail?id=${deal.id}`)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 text-gray-700 text-sm transition-colors"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}