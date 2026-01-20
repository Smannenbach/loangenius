import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import AddFeeModal from './AddFeeModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CD_SECTIONS = {
  A: 'Origination Charges',
  B: 'Services You Cannot Shop For',
  C: 'Services You Can Shop For',
  E: 'Taxes and Government Fees',
  F: 'Prepaids',
  G: 'Initial Escrow at Closing',
};

export default function FeesTab({ dealId, deal }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [deleteConfirmFee, setDeleteConfirmFee] = useState(null);
  const queryClient = useQueryClient();

  const { data: fees = [] } = useQuery({
    queryKey: ['deal-fees', dealId],
    queryFn: async () => {
      try {
        return await base44.entities.Fee.filter({ deal_id: dealId });
      } catch {
        return await base44.entities.DealFee.filter({ deal_id: dealId });
      }
    },
    enabled: !!dealId,
  });

  const deleteMutation = useMutation({
    mutationFn: (feeId) => base44.entities.Fee.delete(feeId),
    onMutate: async (feeId) => {
      await queryClient.cancelQueries({ queryKey: ['deal-fees', dealId] });
      const previousFees = queryClient.getQueryData(['deal-fees', dealId]);
      queryClient.setQueryData(['deal-fees', dealId], (old) => 
        old ? old.filter(f => f.id !== feeId) : []
      );
      return { previousFees };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-fees', dealId] });
      toast.success('Fee deleted');
    },
    onError: (error, feeId, context) => {
      if (context?.previousFees) {
        queryClient.setQueryData(['deal-fees', dealId], context.previousFees);
      }
      toast.error('Failed to delete fee');
    },
  });

  const groupedFees = fees.reduce((acc, fee) => {
    const section = fee.hud_line?.[0] || 'Z';
    if (!acc[section]) acc[section] = [];
    acc[section].push(fee);
    return acc;
  }, {});

  const sortedSections = Object.keys(groupedFees).sort();

  const calculateSectionTotal = (sectionFees) => {
    return sectionFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
  };

  const calculateTotals = () => {
    const borrowerTotal = fees
      .filter(f => f.paid_by === 'Borrower')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    
    const sellerTotal = fees
      .filter(f => f.paid_by === 'Seller')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const financedTotal = fees
      .filter(f => f.is_financed)
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const pocTotal = fees
      .filter(f => f.is_poc)
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const closingCostsTotal = fees
      .filter(f => f.paid_by === 'Borrower' && !f.is_poc)
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    let cashToClose = 0;
    if (deal?.loan_purpose === 'Purchase') {
      const downPayment = deal.purchase_price - deal.loan_amount;
      cashToClose = downPayment + closingCostsTotal - financedTotal - pocTotal;
    } else {
      cashToClose = closingCostsTotal - financedTotal - pocTotal;
    }

    return {
      borrowerTotal,
      sellerTotal,
      financedTotal,
      pocTotal,
      closingCostsTotal,
      cashToClose,
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fees & Closing Costs</h3>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Fee
        </Button>
      </div>

      {/* Empty State */}
      {fees.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No fees added yet</h3>
            <p className="text-gray-500 mb-4">Add closing costs and fees to calculate cash to close</p>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Fee
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Fee Sections */}
      {fees.length > 0 && <div className="space-y-6">
        {sortedSections.map((section) => {
          const sectionFees = groupedFees[section];
          const sectionTitle = CD_SECTIONS[section] || `Section ${section}`;
          const sectionTotal = calculateSectionTotal(sectionFees);

          return (
            <div key={section}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  {section}. {sectionTitle}
                </h4>
                <span className="text-right font-semibold text-gray-900">
                  ${sectionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <Card className="border-gray-200">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {sectionFees.map((fee) => (
                      <div key={fee.id} className="flex items-center justify-between p-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">{fee.hud_line}</span>
                            <span className="text-sm font-medium text-gray-900">{fee.fee_name}</span>
                          </div>
                          {!fee.amount && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                              <span className="text-xs text-yellow-600">Needs amount</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right min-w-24">
                            <div className="font-semibold text-gray-900">
                              ${(fee.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-500">{fee.paid_by}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingFee(fee)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmFee(fee)}
                              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>}

      {/* Totals Section */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-6 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Closing Costs (Borrower)</span>
            <span className="font-semibold">${totals.closingCostsTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Seller Credits</span>
            <span className="font-semibold">${totals.sellerTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Financed</span>
            <span className="font-semibold">${totals.financedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Paid Outside Closing (POC)</span>
            <span className="font-semibold">${totals.pocTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="border-t pt-3 flex justify-between">
            <span className="font-semibold text-gray-900">Estimated Cash to Close</span>
            <span className="text-lg font-bold text-blue-600">
              ${totals.cashToClose.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddFeeModal
        isOpen={showAddModal}
        dealId={dealId}
        fee={editingFee}
        onClose={() => {
          setShowAddModal(false);
          setEditingFee(null);
        }}
      />

      <AlertDialog open={!!deleteConfirmFee} onOpenChange={() => setDeleteConfirmFee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmFee?.fee_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate(deleteConfirmFee.id);
                setDeleteConfirmFee(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}