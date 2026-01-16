import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Clock, 
  Eye, Download, Loader2, Camera, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

const DOCUMENT_CATEGORIES = [
  { id: 'income', label: 'Income Verification', icon: '💰' },
  { id: 'assets', label: 'Asset Statements', icon: '🏦' },
  { id: 'property', label: 'Property Documents', icon: '🏠' },
  { id: 'identity', label: 'Identity Documents', icon: '🪪' },
  { id: 'insurance', label: 'Insurance', icon: '🛡️' },
  { id: 'other', label: 'Other', icon: '📄' }
];

export default function PortalDocumentCenter({ dealId, borrowerEmail, tasks }) {
  const [expandedCategory, setExpandedCategory] = useState('income');
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch document requirements
  const { data: requirements = [] } = useQuery({
    queryKey: ['documentRequirements', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.DealDocumentRequirement.filter({ deal_id: dealId });
    },
    enabled: !!dealId
  });

  // Fetch uploaded documents
  const { data: documents = [] } = useQuery({
    queryKey: ['dealDocuments', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.Document.filter({ deal_id: dealId });
    },
    enabled: !!dealId
  });

  // Fetch document analyses
  const { data: analyses = [] } = useQuery({
    queryKey: ['documentAnalyses', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      return await base44.entities.DocumentAnalysis.filter({ deal_id: dealId });
    },
    enabled: !!dealId
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, category, requirementId }) => {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create document record
      const doc = await base44.entities.Document.create({
        deal_id: dealId,
        file_name: file.name,
        file_url,
        document_type: category,
        status: 'pending_review',
        uploaded_by: borrowerEmail
      });

      // Analyze document
      try {
        await base44.functions.invoke('analyzeDocument', {
          deal_id: dealId,
          document_id: doc.id,
          file_url,
          file_name: file.name,
          expected_type: category
        });
      } catch (e) {
        console.error('Analysis failed:', e);
      }

      // Update requirement if linked
      if (requirementId) {
        await base44.entities.DealDocumentRequirement.update(requirementId, {
          status: 'uploaded',
          document_id: doc.id
        });
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['documentRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['documentAnalyses'] });
      toast.success('Document uploaded successfully!');
      setUploadingDoc(null);
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
      setUploadingDoc(null);
    }
  });

  const handleFileSelect = (files, category, requirementId) => {
    if (files.length === 0) return;
    
    const file = files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      toast.error('Please upload PDF, JPG, or PNG files');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setUploadingDoc(requirementId || category);
    uploadMutation.mutate({ file, category, requirementId });
  };

  const getRequirementsByCategory = (categoryId) => {
    return requirements.filter(r => 
      r.category?.toLowerCase() === categoryId || 
      (!r.category && categoryId === 'other')
    );
  };

  const getDocumentStatus = (doc) => {
    const analysis = analyses.find(a => a.document_id === doc.id);
    if (!analysis) return { status: 'pending', color: 'gray', label: 'Pending Review' };
    
    if (analysis.completeness_score >= 80 && !analysis.is_expired) {
      return { status: 'approved', color: 'green', label: 'Accepted' };
    } else if (analysis.issues_found?.length > 0) {
      return { status: 'issues', color: 'red', label: 'Needs Attention' };
    }
    return { status: 'review', color: 'yellow', label: 'Under Review' };
  };

  const completedCount = requirements.filter(r => r.status === 'approved' || r.status === 'uploaded').length;
  const totalRequired = requirements.filter(r => r.visible_to_borrower !== false).length;
  const overallProgress = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">Document Completion</span>
            <span className="text-green-600 font-semibold">{completedCount} / {totalRequired}</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <p className="text-sm text-gray-500 mt-2">
            {overallProgress === 100 
              ? '✅ All required documents uploaded!' 
              : `${totalRequired - completedCount} documents remaining`}
          </p>
        </CardContent>
      </Card>

      {/* Document Categories */}
      <div className="space-y-4">
        {DOCUMENT_CATEGORIES.map((category) => {
          const categoryReqs = getRequirementsByCategory(category.id);
          const categoryDocs = documents.filter(d => d.document_type === category.id);
          const isExpanded = expandedCategory === category.id;
          const hasPending = categoryReqs.some(r => r.status === 'pending');

          return (
            <Card key={category.id} className={hasPending ? 'border-orange-200' : ''}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{category.icon}</span>
                    {category.label}
                    {hasPending && (
                      <Badge variant="outline" className="border-orange-300 text-orange-600 text-xs">
                        Action Needed
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {categoryDocs.length} uploaded
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Required Documents */}
                  {categoryReqs.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Required Documents:</p>
                      {categoryReqs.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {req.status === 'approved' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : req.status === 'uploaded' ? (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-orange-500" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{req.name}</p>
                              <p className="text-xs text-gray-500">{req.description || 'Required for loan processing'}</p>
                            </div>
                          </div>
                          {req.status === 'pending' ? (
                            <div>
                              <input
                                type="file"
                                className="hidden"
                                id={`upload-${req.id}`}
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileSelect(Array.from(e.target.files), category.id, req.id)}
                              />
                              <label htmlFor={`upload-${req.id}`}>
                                <Button 
                                  size="sm" 
                                  className="gap-2 cursor-pointer"
                                  disabled={uploadingDoc === req.id}
                                  asChild
                                >
                                  <span>
                                    {uploadingDoc === req.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4" />
                                    )}
                                    Upload
                                  </span>
                                </Button>
                              </label>
                            </div>
                          ) : (
                            <Badge className={
                              req.status === 'approved' ? 'bg-green-100 text-green-700' :
                              'bg-yellow-100 text-yellow-700'
                            }>
                              {req.status === 'approved' ? 'Accepted' : 'Under Review'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Uploaded Documents */}
                  {categoryDocs.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-gray-700">Uploaded:</p>
                      {categoryDocs.map((doc) => {
                        const status = getDocumentStatus(doc);
                        return (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="font-medium text-sm">{doc.file_name}</p>
                                <p className="text-xs text-gray-500">
                                  Uploaded {new Date(doc.created_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`bg-${status.color}-100 text-${status.color}-700`}>
                                {status.label}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Upload New */}
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      className="hidden"
                      id={`upload-${category.id}`}
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileSelect(Array.from(e.target.files), category.id, null)}
                    />
                    <label htmlFor={`upload-${category.id}`} className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, JPG, PNG up to 10MB
                      </p>
                    </label>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}