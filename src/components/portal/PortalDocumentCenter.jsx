import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, CheckCircle2, XCircle, AlertCircle, 
  Loader2, FileText, Eye, Info, ChevronDown, ChevronUp 
} from 'lucide-react';
import { toast } from 'sonner';

export default function PortalDocumentCenter({ dealId, borrowerEmail }) {
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState({
    identity: true,
    financials: true,
    entity: true,
    property: true,
    authorization: true,
    appraisal: true
  });
  const [uploadingReq, setUploadingReq] = useState(null);
  const fileInputRefs = useRef({});

  // Default document requirements if none exist for the deal
  const defaultRequirements = [
    { id: 'default-1', requirement_name: 'Government-Issued Photo ID', requirement_type: 'photo_id', category: 'identity', is_required: true, status: 'pending', instructions: 'Upload a valid driver\'s license, passport, or state ID (front and back)' },
    { id: 'default-2', requirement_name: 'Bank Statements (Last 2 Months)', requirement_type: 'bank_statements', category: 'financials', is_required: true, status: 'pending', instructions: 'All pages of your most recent 2 months of bank statements' },
    { id: 'default-3', requirement_name: 'Current Mortgage Statement', requirement_type: 'mortgage_statement', category: 'financials', is_required: false, status: 'pending', instructions: 'Most recent mortgage statement showing current balance (for refinances)', is_conditional: true, condition_description: 'Required for refinance' },
    { id: 'default-4', requirement_name: 'LLC Articles of Organization', requirement_type: 'llc_articles', category: 'entity', is_required: false, status: 'pending', instructions: 'State-filed Articles of Organization for your LLC', is_conditional: true, condition_description: 'Required if entity vesting' },
    { id: 'default-5', requirement_name: 'LLC Operating Agreement', requirement_type: 'llc_operating_agreement', category: 'entity', is_required: false, status: 'pending', instructions: 'Fully executed Operating Agreement showing ownership', is_conditional: true, condition_description: 'Required if entity vesting' },
    { id: 'default-6', requirement_name: 'Current Lease Agreement', requirement_type: 'lease_agreement', category: 'property', is_required: true, status: 'pending', instructions: 'Signed lease agreement for the property (if currently rented)' },
    { id: 'default-7', requirement_name: 'Homeowners Insurance Quote/Dec Page', requirement_type: 'homeowners_insurance', category: 'property', is_required: true, status: 'pending', instructions: 'Insurance quote or declarations page showing coverage' },
    { id: 'default-8', requirement_name: 'Purchase Contract', requirement_type: 'purchase_contract', category: 'property', is_required: false, status: 'pending', instructions: 'Fully executed purchase contract', is_conditional: true, condition_description: 'Required for purchase loans' },
    { id: 'default-9', requirement_name: 'Credit Authorization', requirement_type: 'credit_authorization', category: 'authorization', is_required: true, status: 'pending', instructions: 'Signed authorization to pull credit report' },
    { id: 'default-10', requirement_name: 'Borrower Certification', requirement_type: 'borrower_certification', category: 'authorization', is_required: true, status: 'pending', instructions: 'Signed borrower certification form' },
  ];

  // Fetch document requirements for this deal
  const { data: fetchedRequirements = [], isLoading } = useQuery({
    queryKey: ['dealDocumentRequirements', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        return await base44.entities.DealDocumentRequirement.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId
  });

  // Use fetched requirements if they exist, otherwise show defaults
  const requirements = fetchedRequirements.length > 0 ? fetchedRequirements : defaultRequirements;

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ requirementId, file }) => {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Then link to requirement
      const response = await base44.functions.invoke('uploadBorrowerDocument', {
        deal_id: dealId,
        requirement_id: requirementId,
        file_url,
        file_name: file.name
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dealDocumentRequirements'] });
      queryClient.invalidateQueries({ queryKey: ['dealDocuments'] });
      setUploadingReq(null);
      toast.success('Document uploaded successfully!');
    },
    onError: (error) => {
      setUploadingReq(null);
      toast.error('Upload failed: ' + error.message);
    }
  });

  const handleFileSelect = async (requirementId, file) => {
    if (!file) return;
    
    // Validate file
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'].includes(ext)) {
      toast.error('Invalid file type. Please upload PDF, JPG, PNG, or DOC files.');
      return;
    }
    
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 15MB.');
      return;
    }
    
    setUploadingReq(requirementId);
    uploadMutation.mutate({ requirementId, file });
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Group requirements by category
  const groupedRequirements = requirements.reduce((acc, req) => {
    const category = req.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(req);
    return acc;
  }, {});

  const categoryLabels = {
    identity: 'Identity Documents',
    financials: 'Financial Documents',
    entity: 'Entity Documents (LLC/Corp)',
    property: 'Property Documents',
    authorization: 'Authorizations & Consents',
    appraisal: 'Appraisal & Valuation'
  };

  const categoryIcons = {
    identity: '🪪',
    financials: '💰',
    entity: '🏢',
    property: '🏠',
    authorization: '✍️',
    appraisal: '📊'
  };

  // Calculate progress
  const totalRequired = requirements.filter(r => r.is_required).length;
  const completedRequired = requirements.filter(r => r.is_required && (r.status === 'accepted' || r.status === 'uploaded')).length;
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'uploaded':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'under_review':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'waived':
        return <CheckCircle2 className="h-5 w-5 text-gray-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700">✓ Approved</Badge>;
      case 'uploaded':
        return <Badge className="bg-blue-100 text-blue-700">📤 In Review</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-700">👁️ Reviewing</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">✗ Rejected</Badge>;
      case 'waived':
        return <Badge className="bg-gray-100 text-gray-700">Waived</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-700">⏳ Needed</Badge>;
    }
  };

  if (!dealId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No active loan application</p>
          <p className="text-sm text-gray-400 mt-1">Start an application to upload documents</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Document Upload Progress</h3>
                <p className="text-sm text-gray-600">
                  {completedRequired} of {totalRequired} required documents uploaded
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{progress}%</div>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Document Categories */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Loading document requirements...</p>
        </div>
      ) : requirements.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="font-semibold text-gray-900 mb-2">No documents required yet</h3>
            <p className="text-gray-500">Requirements will appear once your loan officer sets them up</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedRequirements).map(([category, categoryReqs]) => {
          const isExpanded = expandedCategories[category];
          const categoryComplete = categoryReqs.every(r => !r.is_required || ['accepted', 'uploaded', 'waived'].includes(r.status));
          
          return (
            <Card key={category} className={categoryComplete ? 'border-green-200 bg-green-50/30' : ''}>
              <CardHeader className="cursor-pointer" onClick={() => toggleCategory(category)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{categoryIcons[category]}</span>
                    {categoryLabels[category]}
                    <Badge variant="outline" className="ml-2">
                      {categoryReqs.filter(r => r.status === 'accepted' || r.status === 'uploaded').length}/{categoryReqs.length}
                    </Badge>
                  </CardTitle>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="space-y-3">
                  {categoryReqs.map((req) => {
                    const isUploading = uploadingReq === req.id;
                    const canUpload = !['accepted', 'waived'].includes(req.status);
                    
                    return (
                      <div 
                        key={req.id} 
                        className={`p-4 border rounded-lg ${
                          req.status === 'accepted' ? 'bg-green-50 border-green-200' :
                          req.status === 'rejected' ? 'bg-red-50 border-red-200' :
                          req.status === 'uploaded' ? 'bg-blue-50 border-blue-200' :
                          'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            {getStatusIcon(req.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900">{req.requirement_name}</h4>
                                {req.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                {req.is_conditional && (
                                  <Badge variant="outline" className="text-xs">
                                    <Info className="h-3 w-3 mr-1" />
                                    {req.condition_description}
                                  </Badge>
                                )}
                              </div>
                              {req.instructions && (
                                <p className="text-sm text-gray-600 mt-1">{req.instructions}</p>
                              )}
                              {req.rejection_reason && req.status === 'rejected' && (
                                <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                                  <strong>⚠ Rejected:</strong> {req.rejection_reason}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="ml-3">
                            {getStatusBadge(req.status)}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          {canUpload && (
                            <>
                              <input
                                type="file"
                                ref={el => fileInputRefs.current[req.id] = el}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) handleFileSelect(req.id, file);
                                }}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                className="hidden"
                              />
                              <Button
                                size="sm"
                                onClick={() => fileInputRefs.current[req.id]?.click()}
                                disabled={isUploading}
                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                              >
                                {isUploading ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    {req.status === 'rejected' ? 'Upload New' : 'Upload'}
                                  </>
                                )}
                              </Button>
                            </>
                          )}
                          {req.document_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={async () => {
                                try {
                                  const doc = await base44.entities.Document.get(req.document_id);
                                  if (doc?.file_url) {
                                    window.open(doc.file_url, '_blank');
                                  }
                                } catch (e) {
                                  toast.error('Failed to open document');
                                }
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })
      )}

      {/* Completion Message */}
      {progress === 100 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-600" />
            <h3 className="text-xl font-bold text-green-900 mb-2">All Documents Submitted! 🎉</h3>
            <p className="text-green-700">
              Thank you for uploading all required documents. We'll review them and be in touch soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Need help?</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Accepted formats: PDF, JPG, PNG, DOC</li>
                <li>• Maximum file size: 15MB</li>
                <li>• Make sure documents are clear and complete</li>
                <li>• For multi-page documents, upload all pages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}