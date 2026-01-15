import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  'Origination',
  'Third_Party',
  'Government',
  'Prepaid',
  'Escrow',
  'Title',
  'Other',
];

const PAID_BY_OPTIONS = ['Borrower', 'Seller', 'Lender', 'Split'];

export default function AddFeeModal({ isOpen, dealId, fee, onClose }) {
  const [formData, setFormData] = useState({
    fee_name: '',
    amount: '',
    fee_category: 'Other',
    paid_by: 'Borrower',
    is_financed: false,
    is_poc: false,
    hud_line: '',
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (fee) {
      setFormData({
        fee_name: fee.fee_name,
        amount: fee.amount || '',
        fee_category: fee.fee_category,
        paid_by: fee.paid_by,
        is_financed: fee.is_financed,
        is_poc: fee.is_poc,
        hud_line: fee.hud_line || '',
      });
    } else {
      setFormData({
        fee_name: '',
        amount: '',
        fee_category: 'Other',
        paid_by: 'Borrower',
        is_financed: false,
        is_poc: false,
        hud_line: '',
      });
    }
  }, [fee, isOpen]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Fee.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-fees', dealId] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Fee.update(fee.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-fees', dealId] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      deal_id: dealId,
      fee_name: formData.fee_name,
      amount: parseFloat(formData.amount) || null,
      fee_category: formData.fee_category,
      paid_by: formData.paid_by,
      is_financed: formData.is_financed,
      is_poc: formData.is_poc,
      hud_line: formData.hud_line,
    };

    if (fee) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fee ? 'Edit Fee' : 'Add Fee'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Fee Name</Label>
            <Input
              value={formData.fee_name}
              onChange={(e) => setFormData({ ...formData, fee_name: e.target.value })}
              placeholder="e.g., Origination Fee"
              required
            />
          </div>

          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select
              value={formData.fee_category}
              onValueChange={(value) => setFormData({ ...formData, fee_category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Paid By</Label>
            <Select
              value={formData.paid_by}
              onValueChange={(value) => setFormData({ ...formData, paid_by: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAID_BY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>HUD Line</Label>
            <Input
              value={formData.hud_line}
              onChange={(e) => setFormData({ ...formData, hud_line: e.target.value })}
              placeholder="e.g., A.1"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_financed}
                onChange={(e) => setFormData({ ...formData, is_financed: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Finance into loan amount</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_poc}
                onChange={(e) => setFormData({ ...formData, is_poc: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Paid Outside Closing (POC)</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {fee ? 'Update Fee' : 'Add Fee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}