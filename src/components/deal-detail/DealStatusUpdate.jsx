import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const STAGES = [
  { value: 'inquiry', label: 'Inquiry', color: 'bg-gray-100 text-gray-700' },
  { value: 'application', label: 'Application', color: 'bg-blue-100 text-blue-700' },
  { value: 'processing', label: 'Processing', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'underwriting', label: 'Underwriting', color: 'bg-purple-100 text-purple-700' },
  { value: 'approved', label: 'Conditional Approval', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'closing', label: 'Clear to Close', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'funded', label: 'Funded', color: 'bg-green-100 text-green-700' },
  { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-700' },
];

export default function DealStatusUpdate({ deal, dealId }) {
  const [newStage, setNewStage] = useState(deal?.stage || 'inquiry');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const updateStageMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await base44.functions.invoke('updateDealStage', {
          deal_id: dealId,
          stage: newStage,
          notes,
        });
        return response.data;
      } catch (e) {
        // Fallback: update directly
        return await base44.entities.Deal.update(dealId, { stage: newStage });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
      setNotes('');
      toast.success('Deal stage updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update stage: ' + error.message);
    },
  });

  const currentStageData = STAGES.find(s => s.value === deal?.stage);
  const stageIndex = STAGES.findIndex(s => s.value === deal?.stage);
  const progress = ((stageIndex + 1) / STAGES.length) * 100;

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Deal Status & Workflow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Current Stage</p>
          <div className={`inline-flex px-4 py-2 rounded-full font-medium ${currentStageData?.color}`}>
            {currentStageData?.label}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Pipeline Progress</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{Math.round(progress)}% complete</p>
        </div>

        {/* Stage Update */}
        <div className="space-y-3 pt-4 border-t">
          <p className="text-sm font-medium text-gray-700">Move to Next Stage</p>
          <Select value={newStage} onValueChange={setNewStage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <textarea
            placeholder="Add notes about this stage change (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />

          <Button
            onClick={() => updateStageMutation.mutate()}
            disabled={updateStageMutation.isPending || newStage === deal?.stage}
            className="w-full bg-blue-600 hover:bg-blue-500 gap-2"
          >
            {updateStageMutation.isPending ? 'Updating...' : 'Update Stage'}
          </Button>

          {updateStageMutation.isError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{updateStageMutation.error?.message}</p>
            </div>
          )}

          {updateStageMutation.isSuccess && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">Stage updated successfully</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}