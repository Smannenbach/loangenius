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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, FileText, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  'appraisal',
  'bank_statement',
  'lease_agreement',
  'insurance',
  'title_report',
  'credit_report',
  'tax_return',
  'rental_income_verification',
  'homeowners_insurance',
  'flood_certificate',
  'other'
];

export default function UploadDocumentModal({ dealId, orgId, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create document record
      await base44.entities.Document.create({
        org_id: orgId,
        deal_id: dealId,
        name: documentName || file.name,
        document_type: documentType,
        file_url,
        status: 'pending',
        uploaded_at: new Date().toISOString(),
      });
      
      return { file_url };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-documents', dealId] });
      toast.success('Document uploaded successfully');
      setFile(null);
      setDocumentType('');
      setDocumentName('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload a new document to this deal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Document Name (optional)</Label>
            <Input
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Leave blank to use filename"
            />
          </div>

          <div>
            <Label>File *</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                ) : (
                  <div>
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">Click to select file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG, PNG (max 25MB)</p>
                  </div>
                )}
              </label>
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
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !file || !documentType}
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}