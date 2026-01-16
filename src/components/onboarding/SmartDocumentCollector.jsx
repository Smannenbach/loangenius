import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, CheckCircle2, AlertCircle, XCircle, Loader2, 
  FileText, Camera, X, ChevronDown, ChevronUp, 
  Eye, RefreshCw, Info
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_REQUIREMENTS = [
  {
    id: 'bank_statement',
    label: 'Bank Statements',
    description: 'Last 2 months of statements for all accounts',
    required: true,
    minCount: 2,
    tips: ['All pages required', 'Must show account holder name', 'Should show ending balance']
  },
  {
    id: 'id_document',
    label: 'Government ID',
    description: 'Valid driver\'s license or passport',
    required: true,
    minCount: 1,
    tips: ['Must not be expired', 'Photo must be clear']
  },
  {
    id: 'insurance',
    label: 'Property Insurance',
    description: 'Current insurance declarations page',
    required: true,
    minCount: 1,
    tips: ['Must show property address', 'Coverage amount visible']
  },
  {
    id: 'lease_agreement',
    label: 'Lease Agreement',
    description: 'Current executed lease for investment property',
    required: false,
    minCount: 1,
    tips: ['Signed by all parties', 'Shows rental amount', 'Property address matches']
  },
  {
    id: 'entity_docs',
    label: 'Entity Documents',
    description: 'Operating agreement, articles of organization (if LLC)',
    required: false,
    minCount: 1,
    tips: ['Current and signed', 'Shows all members']
  }
];

export default function SmartDocumentCollector({ orgId, dealId, borrowerId, onComplete }) {
  const [documents, setDocuments] = useState({});
  const [expandedDocs, setExpandedDocs] = useState({});
  const [analyzingDocs, setAnalyzingDocs] = useState({});
  const fileInputRefs = useRef({});

  // Fetch existing document analyses for this deal
  const { data: existingAnalyses = [] } = useQuery({
    queryKey: ['documentAnalyses', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.DocumentAnalysis.filter({ deal_id: dealId });
    },
    enabled: !!dealId
  });

  const uploadAndAnalyzeMutation = useMutation({
    mutationFn: async ({ docType, file }) => {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Then analyze
      const response = await base44.functions.invoke('analyzeDocument', {
        org_id: orgId,
        deal_id: dealId,
        borrower_id: borrowerId,
        file_url,
        file_name: file.name,
        expected_type: docType
      });
      
      return { ...response.data, docType, file_url, file_name: file.name };
    },
    onSuccess: (data) => {
      setDocuments(prev => ({
        ...prev,
        [data.docType]: [
          ...(prev[data.docType] || []),
          data
        ]
      }));
      setAnalyzingDocs(prev => ({ ...prev, [data.docType]: false }));
      
      if (data.feedback?.type === 'success') {
        toast.success(data.feedback.message);
      } else if (data.feedback?.type === 'warning') {
        toast.warning(data.feedback.message);
      } else {
        toast.error(data.feedback?.message || 'Document needs review');
      }
    },
    onError: (error, variables) => {
      setAnalyzingDocs(prev => ({ ...prev, [variables.docType]: false }));
      toast.error('Upload failed: ' + error.message);
    }
  });

  const handleFileSelect = async (docType, files) => {
    for (const file of files) {
      // Validate file
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        toast.error(`Invalid file type: ${file.name}`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        continue;
      }
      
      setAnalyzingDocs(prev => ({ ...prev, [docType]: true }));
      uploadAndAnalyzeMutation.mutate({ docType, file });
    }
  };

  const removeDocument = (docType, index) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: prev[docType]?.filter((_, i) => i !== index)
    }));
  };

  const getDocumentStatus = (docType) => {
    const docs = documents[docType] || [];
    const req = DOCUMENT_REQUIREMENTS.find(r => r.id === docType);
    
    if (docs.length === 0) return { status: 'pending', color: 'gray' };
    
    const hasIssues = docs.some(d => d.feedback?.type === 'error' || d.issues?.length > 0);
    const allGood = docs.every(d => d.feedback?.type === 'success');
    const meetsCount = docs.length >= (req?.minCount || 1);
    
    if (allGood && meetsCount) return { status: 'complete', color: 'green' };
    if (hasIssues) return { status: 'issues', color: 'red' };
    if (docs.length > 0) return { status: 'partial', color: 'yellow' };
    return { status: 'pending', color: 'gray' };
  };

  const getOverallProgress = () => {
    const required = DOCUMENT_REQUIREMENTS.filter(r => r.required);
    const complete = required.filter(r => getDocumentStatus(r.id).status === 'complete').length;
    return Math.round((complete / required.length) * 100);
  };

  const canProceed = () => {
    const required = DOCUMENT_REQUIREMENTS.filter(r => r.required);
    return required.every(r => {
      const docs = documents[r.id] || [];
      return docs.length >= (r.minCount || 1);
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Document Collection Progress</span>
            <span className="text-sm text-gray-600">{getOverallProgress()}% complete</span>
          </div>
          <Progress value={getOverallProgress()} className="h-2" />
          <p className="text-sm text-gray-500 mt-2">
            Upload required documents and our AI will instantly verify completeness
          </p>
        </CardContent>
      </Card>

      {/* Document Requirements */}
      <div className="space-y-3">
        {DOCUMENT_REQUIREMENTS.map((req) => {
          const status = getDocumentStatus(req.id);
          const docs = documents[req.id] || [];
          const isExpanded = expandedDocs[req.id];
          const isAnalyzing = analyzingDocs[req.id];

          return (
            <Card key={req.id} className={`border-2 ${
              status.color === 'green' ? 'border-green-200 bg-green-50/30' :
              status.color === 'red' ? 'border-red-200 bg-red-50/30' :
              status.color === 'yellow' ? 'border-yellow-200 bg-yellow-50/30' :
              'border-gray-200'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {status.status === 'complete' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {status.status === 'issues' && <XCircle className="h-5 w-5 text-red-500" />}
                    {status.status === 'partial' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                    {status.status === 'pending' && <FileText className="h-5 w-5 text-gray-400" />}
                    
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {req.label}
                        {req.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                      </CardTitle>
                      <p className="text-sm text-gray-500">{req.description}</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDocs(prev => ({ ...prev, [req.id]: !prev[req.id] }))}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Upload Area */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="file"
                    ref={el => fileInputRefs.current[req.id] = el}
                    onChange={(e) => handleFileSelect(req.id, Array.from(e.target.files))}
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[req.id]?.click()}
                    disabled={isAnalyzing}
                    className="gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-gray-500 self-center">
                    {docs.length} / {req.minCount} uploaded
                  </span>
                </div>

                {/* Tips (expanded) */}
                {isExpanded && req.tips && (
                  <div className="p-3 bg-blue-50 rounded-lg mb-3">
                    <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                      <Info className="h-3 w-3" /> Tips for this document:
                    </p>
                    <ul className="text-xs text-blue-700 space-y-1">
                      {req.tips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Uploaded Documents */}
                {docs.length > 0 && (
                  <div className="space-y-2">
                    {docs.map((doc, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 bg-white rounded border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {doc.feedback?.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />}
                            {doc.feedback?.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                            {doc.feedback?.type === 'error' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                            <span className="text-sm font-medium truncate">{doc.file_name}</span>
                          </div>
                          
                          {/* Scores */}
                          {doc.scores && (
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                              <span>Quality: {doc.scores.quality}%</span>
                              <span>Complete: {doc.scores.completeness}%</span>
                              <span>Compliant: {doc.scores.compliance}%</span>
                            </div>
                          )}

                          {/* Summary */}
                          {doc.summary && isExpanded && (
                            <p className="text-xs text-gray-600 mt-1">{doc.summary}</p>
                          )}

                          {/* Issues */}
                          {doc.issues?.length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                              <p className="font-medium text-red-700 mb-1">Issues found:</p>
                              {doc.issues.map((issue, i) => (
                                <p key={i} className="text-red-600">• {issue}</p>
                              ))}
                            </div>
                          )}

                          {/* Suggestions */}
                          {doc.suggestions?.length > 0 && isExpanded && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                              <p className="font-medium text-yellow-700 mb-1">Suggestions:</p>
                              {doc.suggestions.map((sug, i) => (
                                <p key={i} className="text-yellow-600">• {sug}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500"
                            onClick={() => removeDocument(req.id, idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-between pt-4">
        <p className="text-sm text-gray-500 self-center">
          {canProceed() 
            ? '✓ All required documents uploaded' 
            : 'Please upload all required documents to continue'}
        </p>
        <Button 
          onClick={onComplete}
          disabled={!canProceed()}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          Continue to Application
        </Button>
      </div>
    </div>
  );
}