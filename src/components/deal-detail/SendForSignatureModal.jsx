import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SendForSignatureModal({ dealId, onClose }) {
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [signers, setSigners] = useState([{ name: '', email: '' }]);
  const [envelopeName, setEnvelopeName] = useState('');
  const [send, setSend] = useState(true);
  const queryClient = useQueryClient();

  const { data: dealDocuments = [], isLoading: docsLoading } = useQuery({
    queryKey: ['deal-documents', dealId],
    queryFn: () => base44.entities.Document.filter({ deal_id: dealId, status: 'approved' }),
    enabled: !!dealId
  });

  const { data: borrowers = [], isLoading: borrowersLoading } = useQuery({
    queryKey: ['deal-borrowers', dealId],
    queryFn: async () => {
      const dealBorrowers = await base44.entities.DealBorrower.filter({ deal_id: dealId });
      if (dealBorrowers.length === 0) return [];
      const borrowerIds = dealBorrowers.map(db => db.borrower_id);
      return await base44.entities.Borrower.filter({ id: { $in: borrowerIds } });
    },
    enabled: !!dealId
  });

  useEffect(() => {
    if (borrowers.length > 0 && signers[0]?.name === '') {
      setSigners(borrowers.map(b => ({
        name: `${b.first_name || ''} ${b.last_name || ''}`.trim(),
        email: b.email || ''
      })));
    }
  }, [borrowers]);

  const mutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createDocuSignEnvelope', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envelopes', dealId] });
      onClose();
    }
  });

  const handleSend = () => {
    if (!envelopeName.trim()) {
      toast.error('Please enter an envelope name');
      return;
    }
    if (selectedDocIds.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    const validSigners = signers.filter(s => s.name && s.email);
    if (validSigners.length === 0) {
      toast.error('Please add at least one signer with name and email');
      return;
    }

    const documents = dealDocuments
      .filter(d => selectedDocIds.includes(d.id))
      .map(d => ({ id: d.id, name: d.name, file_url: d.file_url }));

    mutation.mutate({
      deal_id: dealId,
      envelope_name: envelopeName,
      documents,
      signers: validSigners,
      send_immediately: send
    });
  };

  const toggleDocument = (docId) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const updateSigner = (index, field, value) => {
    setSigners(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addSigner = () => {
    setSigners(prev => [...prev, { name: '', email: '' }]);
  };

  const removeSigner = (index) => {
    if (signers.length > 1) {
      setSigners(prev => prev.filter((_, i) => i !== index));
    }
  };

  const isLoading = docsLoading || borrowersLoading;

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
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading documents...</span>
            </div>
          ) : dealDocuments.length === 0 ? (
            <p className="text-sm text-gray-500">No approved documents available</p>
          ) : (
            dealDocuments.map(doc => (
              <label key={doc.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={selectedDocIds.includes(doc.id)}
                  onCheckedChange={() => toggleDocument(doc.id)}
                />
                <FileText className="h-4 w-4" />
                <span className="text-sm">{doc.name || doc.file_name || 'Untitled'}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Signers</label>
          <Button type="button" variant="ghost" size="sm" onClick={addSigner}>
            <Plus className="h-4 w-4 mr-1" /> Add Signer
          </Button>
        </div>
        <div className="space-y-2">
          {signers.map((signer, idx) => (
            <Card key={idx}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="Borrower Name" 
                    value={signer.name}
                    onChange={(e) => updateSigner(idx, 'name', e.target.value)}
                  />
                  {signers.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSigner(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Input 
                  placeholder="Email" 
                  type="email" 
                  value={signer.email}
                  onChange={(e) => updateSigner(idx, 'email', e.target.value)}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2">
        <Checkbox checked={send} onCheckedChange={setSend} />
        <span className="text-sm">Send immediately</span>
      </label>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={mutation.isPending || isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            'Send for Signature'
          )}
        </Button>
      </div>
    </div>
  );
}