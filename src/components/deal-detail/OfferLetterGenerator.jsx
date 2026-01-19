import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Sparkles, Loader2, FileText, Send, Download, Edit, 
  DollarSign, Percent, Calendar, CheckCircle2, Copy
} from 'lucide-react';
import { toast } from 'sonner';

export default function OfferLetterGenerator({ dealId, deal, borrower, onSend }) {
  const [showModal, setShowModal] = useState(false);
  const [offerLetter, setOfferLetter] = useState('');
  const [termSheet, setTermSheet] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateOfferLetter', {
        deal_id: dealId,
        action: 'generate'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setOfferLetter(data.offer_letter);
      setTermSheet(data.term_sheet);
      setShowModal(true);
      toast.success('Offer letter generated!');
    },
    onError: (error) => {
      toast.error('Failed to generate: ' + error.message);
    }
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      // Send via email
      await base44.integrations.Core.SendEmail({
        to: borrower?.email || termSheet?.borrower?.email,
        subject: `Loan Offer - ${deal?.deal_number || 'Draft'}`,
        body: offerLetter
      });
      return true;
    },
    onSuccess: () => {
      toast.success('Offer letter sent to borrower!');
      setShowModal(false);
      onSend?.();
    },
    onError: (error) => {
      toast.error('Failed to send: ' + error.message);
    }
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(offerLetter);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([offerLetter], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Offer_Letter_${deal?.deal_number || dealId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Offer Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Generate a professional offer letter and term sheet using AI analysis of the deal profile.
          </p>
          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Offer Letter
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Generated Offer Letter
            </DialogTitle>
          </DialogHeader>

          {termSheet && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">Loan Amount</span>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  ${termSheet.loan_terms.amount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Percent className="h-4 w-4" />
                  <span className="text-xs font-medium">Interest Rate</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {termSheet.loan_terms.interest_rate}%
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <span className="text-xs font-medium">LTV</span>
                </div>
                <p className="text-lg font-bold text-purple-900">
                  {termSheet.loan_terms.ltv}%
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <span className="text-xs font-medium">DSCR</span>
                </div>
                <p className="text-lg font-bold text-orange-900">
                  {termSheet.loan_terms.dscr}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                Expires: {termSheet ? new Date(termSheet.expiration_date).toLocaleDateString() : 'N/A'}
              </Badge>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {isEditing ? 'Preview' : 'Edit'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={offerLetter}
                onChange={(e) => setOfferLetter(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />
            ) : (
              <div className="bg-white border rounded-lg p-6 whitespace-pre-wrap text-sm font-serif min-h-[400px]">
                {offerLetter}
              </div>
            )}

            {termSheet && (
              <Card className="bg-slate-50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Standard Conditions</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 gap-2">
                    {termSheet.conditions.map((condition, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {condition}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !borrower?.email}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to Borrower
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}