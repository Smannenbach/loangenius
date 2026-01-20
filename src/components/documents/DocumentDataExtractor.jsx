import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileSearch, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'appraisal', label: 'Appraisal Report' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'insurance', label: 'Insurance Policy' },
  { value: 'title_report', label: 'Title Report' },
  { value: 'general', label: 'Auto-Detect' },
];

export default function DocumentDataExtractor({ dealId, onExtracted }) {
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentType, setDocumentType] = useState('general');
  const [autoPopulate, setAutoPopulate] = useState(true);
  const [extractedData, setExtractedData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const extractMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('extractDocumentData', data),
    onSuccess: (response) => {
      setExtractedData(response.data);
      toast.success('Data extracted successfully');
      onExtracted?.(response.data);
    },
    onError: (error) => {
      toast.error('Extraction failed: ' + error.message);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocumentUrl(file_url);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtract = () => {
    if (!documentUrl) {
      toast.error('Please upload a document first');
      return;
    }
    extractMutation.mutate({
      document_url: documentUrl,
      document_type: documentType,
      deal_id: dealId,
      auto_populate: autoPopulate,
    });
  };

  const renderExtractedValue = (key, value) => {
    if (value === null || value === undefined) return null;
    
    if (Array.isArray(value)) {
      return (
        <div key={key} className="space-y-1">
          <p className="text-xs font-medium text-gray-500">{formatKey(key)}</p>
          <div className="space-y-1">
            {value.slice(0, 5).map((item, idx) => (
              <div key={idx} className="text-sm bg-white p-2 rounded border">
                {typeof item === 'object' 
                  ? Object.entries(item).map(([k, v]) => (
                      <p key={k}><span className="text-gray-500">{formatKey(k)}:</span> {String(v)}</p>
                    ))
                  : String(item)
                }
              </div>
            ))}
            {value.length > 5 && <p className="text-xs text-gray-400">+{value.length - 5} more</p>}
          </div>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div key={key} className="space-y-2 p-2 bg-white rounded border">
          <p className="text-xs font-medium text-gray-500">{formatKey(key)}</p>
          {Object.entries(value).map(([k, v]) => renderExtractedValue(k, v))}
        </div>
      );
    }

    // Format currency values
    const displayValue = typeof value === 'number' && (key.includes('amount') || key.includes('balance') || key.includes('value') || key.includes('rent') || key.includes('income'))
      ? `$${value.toLocaleString()}`
      : String(value);

    return (
      <div key={key} className="flex justify-between items-center py-1 border-b last:border-0">
        <span className="text-sm text-gray-600">{formatKey(key)}</span>
        <span className="text-sm font-medium">{displayValue}</span>
      </div>
    );
  };

  const formatKey = (key) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Data Extractor
        </CardTitle>
        <CardDescription>
          Upload documents and automatically extract key data points
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        <div className="space-y-2">
          <Label>Upload Document</Label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="flex-1"
            />
            {isUploading && <Loader2 className="h-5 w-5 animate-spin self-center" />}
            {documentUrl && <Check className="h-5 w-5 text-green-600 self-center" />}
          </div>
        </div>

        {/* Document Type */}
        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-populate checkbox */}
        {dealId && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="auto-populate"
              checked={autoPopulate}
              onCheckedChange={setAutoPopulate}
            />
            <Label htmlFor="auto-populate" className="text-sm cursor-pointer">
              Auto-populate deal data with extracted values
            </Label>
          </div>
        )}

        {/* Extract Button */}
        <Button
          onClick={handleExtract}
          disabled={!documentUrl || extractMutation.isPending}
          className="w-full bg-purple-600 hover:bg-purple-700"
          data-testid="cta:DocumentDataExtractor:Extract"
        >
          {extractMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <FileSearch className="h-4 w-4 mr-2" />
              Extract Data
            </>
          )}
        </Button>

        {/* Extracted Data Display */}
        {extractedData && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Extracted Data</h4>
              <div className="flex gap-2">
                <Badge variant="outline">{extractedData.document_type}</Badge>
                <Badge 
                  className={
                    extractedData.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    extractedData.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }
                >
                  {extractedData.confidence} confidence
                </Badge>
              </div>
            </div>

            {extractedData.document_quality && extractedData.document_quality !== 'good' && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">
                  Document quality: {extractedData.document_quality}
                </span>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
              {extractedData.extracted_data && Object.entries(extractedData.extracted_data).map(([key, value]) => 
                renderExtractedValue(key, value)
              )}
            </div>

            {extractedData.warnings?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-600">Warnings:</p>
                {extractedData.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-600">• {warning}</p>
                ))}
              </div>
            )}

            {extractedData.auto_populated && (
              <div className="p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">
                  Deal data updated with extracted values
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}