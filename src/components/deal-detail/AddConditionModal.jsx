import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CONDITION_TYPES = [
  { value: 'PTD', label: 'Prior to Docs (PTD)' },
  { value: 'PTF', label: 'Prior to Funding (PTF)' },
  { value: 'PostClosing', label: 'Post-Closing' }
];

export default function AddConditionModal({ dealId, orgId, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    condition_type: 'PTD',
    due_date: '',
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Condition.create({
        org_id: orgId,
        deal_id: dealId,
        ...formData,
        status: 'pending',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-conditions', dealId] });
      toast.success('Condition added successfully');
      setFormData({ title: '', description: '', condition_type: 'PTD', due_date: '' });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to add condition: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            Add Condition
          </DialogTitle>
          <DialogDescription>
            Add a new condition or requirement for this loan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Condition Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Updated appraisal required"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add detailed instructions..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <Select
                value={formData.condition_type}
                onValueChange={(v) => setFormData({ ...formData, condition_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formData.title}
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              Add Condition
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}