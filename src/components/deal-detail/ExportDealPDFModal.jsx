import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportDealPDFModal({ dealId, deal, open, onOpenChange }) {
  const [sections, setSections] = useState({
    summary: true,
    borrowers: true,
    property: true,
    terms: true,
    fees: true,
    documents: true,
    conditions: false,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportDealPDF', {
        deal_id: dealId,
        sections: Object.keys(sections).filter(k => sections[k])
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast.success('PDF exported successfully');
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast.error('PDF export failed: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Export Deal Summary
          </DialogTitle>
          <DialogDescription>
            Select which sections to include in the PDF export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            {Object.entries({
              summary: 'Loan Summary',
              borrowers: 'Borrowers & Entities',
              property: 'Property Details',
              terms: 'Loan Terms',
              fees: 'Fee Breakdown',
              documents: 'Document Checklist',
              conditions: 'Conditions',
            }).map(([key, label]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={sections[key]}
                  onCheckedChange={(checked) =>
                    setSections({ ...sections, [key]: checked })
                  }
                />
                <Label htmlFor={key} className="cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
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
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || Object.values(sections).every(v => !v)}
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}