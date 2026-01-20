import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function SendForSignatureModal({ dealId, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [signers, setSigners] = useState([]);
  const [envelopeName, setEnvelopeName] = useState('');
  const [send, setSend] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createDocuSignEnvelope', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', dealId] });
      onClose();
    }
  });

  const handleSend = () => {
    if (!envelopeName || documents.length === 0 || signers.length === 0) {
      toast.warning('Please fill in all required fields');
      return;
    }

    mutation.mutate({
      org_id: 'default',
      deal_id: dealId,
      envelope_name: envelopeName,
      documents,
      signers,
      send_immediately: send
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Envelope Name</label>
        <Input
          value={envelopeName}
          onChange={(e) => setEnvelopeName(e.target.value)}
          placeholder="Initial Loan Documents"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Documents</label>
        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
          {/* In real implementation, load from deal documents */}
          <label className="flex items-center gap-2">
            <Checkbox />
            <FileText className="h-4 w-4" />
            <span className="text-sm">Anti-Steering Letter.pdf</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox />
            <FileText className="h-4 w-4" />
            <span className="text-sm">Borrower Authorization.pdf</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Signers</label>
        <div className="space-y-2">
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Input placeholder="Borrower Name" defaultValue="John Smith" />
              <Input placeholder="Email" type="email" defaultValue="john@email.com" />
            </CardContent>
          </Card>
        </div>
      </div>

      <label className="flex items-center gap-2">
        <Checkbox checked={send} onChange={(e) => setSend(e.target.checked)} />
        <span className="text-sm">Send immediately</span>
      </label>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={mutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Send for Signature
        </Button>
      </div>
    </div>
  );
}