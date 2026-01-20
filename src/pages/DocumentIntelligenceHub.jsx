import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText, Sparkles, Search, FileSearch, Upload, Download,
  AlertTriangle, CheckCircle2, Clock, Bot, Zap, Building2
} from 'lucide-react';
import DocumentGenerator from '@/components/documents/DocumentGenerator';
import SmartDocumentReview from '@/components/documents/SmartDocumentReview';
import DocumentDataExtractor from '@/components/documents/DocumentDataExtractor';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DocumentIntelligenceHub() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedDealId, setSelectedDealId] = useState('');
  const { orgId, isLoading: orgLoading } = useOrgId();

  // Fetch deals for dropdown
  const { data: deals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['deals', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.Deal.filter({ org_id: orgId, is_deleted: false });
    },
    enabled: !!orgId,
  });

  // Fetch generated documents
  const { data: generatedDocs = [] } = useQuery({
    queryKey: ['generatedDocuments', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.GeneratedDocument.filter({ org_id: orgId });
    },
    enabled: !!orgId,
  });

  // Fetch document issues
  const { data: documentIssues = [] } = useQuery({
    queryKey: ['allDocumentIssues', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.DocumentReviewIssue.filter({ 
        org_id: orgId,
        status: 'open'
      });
    },
    enabled: !!orgId,
  });

  const selectedDeal = deals.find(d => d.id === selectedDealId);

  const stats = {
    generated: generatedDocs.length,
    openIssues: documentIssues.length,
    criticalIssues: documentIssues.filter(i => i.severity === 'critical').length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bot className="h-8 w-8 text-purple-600" />
            Document Intelligence Hub
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered document generation, review, and data extraction
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('LenderIntegrations')}>
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              Lender Integrations
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Documents Generated</p>
                <p className="text-2xl font-bold text-purple-900">{stats.generated}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Open Issues</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.openIssues}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Critical Issues</p>
                <p className="text-2xl font-bold text-red-900">{stats.criticalIssues}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deal Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <Select value={selectedDealId} onValueChange={setSelectedDealId}>
                <SelectTrigger className="w-full md:w-96">
                  <SelectValue placeholder="Select a deal to work with..." />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((deal) => (
                    <SelectItem key={deal.id} value={deal.id}>
                      <div className="flex items-center gap-2">
                        <span>{deal.deal_number || deal.id.slice(0, 8)}</span>
                        <span className="text-gray-500">
                          ${deal.loan_amount?.toLocaleString() || 'N/A'}
                        </span>
                        <Badge variant="outline">{deal.stage}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDeal && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedDeal.loan_product}</span>
                {' • '}
                ${selectedDeal.loan_amount?.toLocaleString()} @ {selectedDeal.interest_rate}%
                {selectedDeal.ltv && ` • LTV: ${selectedDeal.ltv}%`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Documents
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-2">
            <FileSearch className="h-4 w-4" />
            Smart Review
          </TabsTrigger>
          <TabsTrigger value="extract" className="gap-2">
            <Upload className="h-4 w-4" />
            Extract Data
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Generate Documents Tab */}
        <TabsContent value="generate">
          {selectedDealId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DocumentGenerator 
                dealId={selectedDealId}
                deal={selectedDeal}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Quick Generate</CardTitle>
                  <CardDescription>
                    Common document templates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { type: 'term_sheet', label: 'Term Sheet', icon: FileText },
                    { type: 'pre_approval', label: 'Pre-Approval Letter', icon: CheckCircle2 },
                    { type: 'commitment_letter', label: 'Commitment Letter', icon: FileText },
                    { type: 'loan_estimate', label: 'Loan Estimate', icon: FileText },
                  ].map((doc) => (
                    <Button 
                      key={doc.type}
                      variant="outline" 
                      className="w-full justify-start gap-2"
                    >
                      <doc.icon className="h-4 w-4" />
                      Generate {doc.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Select a deal to generate documents</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Smart Review Tab */}
        <TabsContent value="review">
          {selectedDealId ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SmartDocumentReview dealId={selectedDealId} />
              <Card>
                <CardHeader>
                  <CardTitle>Review Checklist</CardTitle>
                  <CardDescription>
                    Items to verify before submission
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      'Borrower information complete',
                      'Property details verified',
                      'Income documentation uploaded',
                      'Credit report current',
                      'Appraisal ordered/received',
                      'Title report clear',
                      'Insurance binder in place',
                      'All signatures collected',
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FileSearch className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Select a deal to review documents</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Extract Data Tab */}
        <TabsContent value="extract">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DocumentDataExtractor 
              dealId={selectedDealId}
              onExtracted={(data) => console.log('Extracted:', data)}
            />
            <Card>
              <CardHeader>
                <CardTitle>Supported Document Types</CardTitle>
                <CardDescription>
                  Documents that can be automatically processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Bank Statements',
                    'Lease Agreements',
                    'Appraisal Reports',
                    'Tax Returns',
                    'Insurance Policies',
                    'Title Reports',
                    'Pay Stubs',
                    'Credit Reports',
                  ].map((type) => (
                    <div 
                      key={type}
                      className="p-2 bg-gray-50 rounded text-sm flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {type}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Generated Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {generatedDocs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p>No documents generated yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {generatedDocs.slice(0, 20).map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-gray-500">
                            {doc.document_type?.replace(/_/g, ' ')} • {new Date(doc.created_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{doc.status}</Badge>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}