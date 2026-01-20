import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Sparkles, Download, Send, Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'initial_disclosure', label: 'Initial Disclosure', description: 'TILA disclosures, APR, payment schedule' },
  { value: 'commitment_letter', label: 'Commitment Letter', description: 'Loan approval with conditions' },
  { value: 'pre_approval', label: 'Pre-Approval Letter', description: 'Pre-approval for borrower' },
  { value: 'term_sheet', label: 'Term Sheet', description: 'Loan terms summary' },
  { value: 'loan_estimate', label: 'Loan Estimate', description: 'LE with closing costs' },
  { value: 'rate_lock_confirmation', label: 'Rate Lock Confirmation', description: 'Rate lock details' },
];

export default function DocumentGenerator({ dealId, deal, onGenerated }) {
  const [selectedType, setSelectedType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateLoanDocument', data),
    onSuccess: (response) => {
      setGeneratedDoc(response.data?.document);
      setPreviewOpen(true);
      toast.success('Document generated successfully');
      queryClient.invalidateQueries({ queryKey: ['generatedDocuments', dealId] });
      onGenerated?.(response.data);
    },
    onError: (error) => {
      toast.error('Failed to generate document: ' + error.message);
    },
  });

  const handleGenerate = () => {
    if (!selectedType) {
      toast.error('Please select a document type');
      return;
    }
    generateMutation.mutate({
      deal_id: dealId,
      document_type: selectedType,
      custom_instructions: customInstructions || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          AI Document Generator
        </CardTitle>
        <CardDescription>
          Generate loan documents automatically using deal data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Select document type..." />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-gray-500">{type.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Custom Instructions (Optional)</Label>
          <Textarea
            placeholder="Add any special instructions for the document..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            rows={3}
          />
        </div>

        {/* Deal Data Preview */}
        {deal && (
          <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
            <p className="font-medium text-gray-700">Deal Data Summary:</p>
            <p className="text-gray-600">Loan: ${deal.loan_amount?.toLocaleString() || 'N/A'} @ {deal.interest_rate || 'N/A'}%</p>
            <p className="text-gray-600">LTV: {deal.ltv || 'N/A'}% | DSCR: {deal.dscr || 'N/A'}</p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={!selectedType || generateMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
          data-testid="cta:DocumentGenerator:Generate"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Document
            </>
          )}
        </Button>

        {generateMutation.data?.data?.missing_data?.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Missing Data</p>
                <p className="text-xs text-yellow-700">
                  {generateMutation.data.data.missing_data.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{generatedDoc?.title || 'Generated Document'}</DialogTitle>
          </DialogHeader>
          {generatedDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>{generatedDoc.document_type?.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline">{generatedDoc.status}</Badge>
              </div>
              <div 
                className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: generatedDoc.content }}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                  Send to Borrower
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}