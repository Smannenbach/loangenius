import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Search, FileText, CheckCircle, Plus, Trash2, Eye, Download, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const knowledgeArticles = [
  {
    id: 1,
    title: 'DSCR Minimum Ratios by Loan Product',
    category: 'Underwriting',
    status: 'published',
    views: 234,
    agents: ['DSCR Underwriter', 'Credit/AUS'],
    updated: '2025-01-10'
  },
  {
    id: 2,
    title: 'Acceptable Income Documentation',
    category: 'Document Quality',
    status: 'published',
    views: 567,
    agents: ['Document Intelligence', 'Document QC'],
    updated: '2025-01-08'
  },
  {
    id: 3,
    title: 'Pricing Matrix & Rate Adjustments',
    category: 'Pricing',
    status: 'published',
    views: 389,
    agents: ['Pricing & Lock', 'Pricing Compliance'],
    updated: '2025-01-12'
  },
  {
    id: 4,
    title: 'Fair Lending Compliance Guidelines',
    category: 'Compliance',
    status: 'published',
    views: 123,
    agents: ['Compliance/Audit', 'Credit/AUS'],
    updated: '2025-01-15'
  },
  {
    id: 5,
    title: 'Fraud Detection Red Flags',
    category: 'Risk Management',
    status: 'draft',
    views: 45,
    agents: ['Fraud Detection', 'Exceptions/HITL'],
    updated: '2025-01-14'
  }
];

const documents = [
  { id: 1, name: 'Pricing Guide 2025.pdf', size: '2.4 MB', type: 'PDF', uploadedAt: '2025-01-10' },
  { id: 2, name: 'Underwriting Standards.docx', size: '1.8 MB', type: 'Document', uploadedAt: '2025-01-08' },
  { id: 3, name: 'Compliance Checklist.xlsx', size: '512 KB', type: 'Spreadsheet', uploadedAt: '2025-01-12' }
];

export default function AgentKnowledgeBase() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isAddDocOpen, setIsAddDocOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState('');

  const filteredArticles = knowledgeArticles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Knowledge Base</h1>
            <p className="text-gray-600 mt-1">Documents, policies, and reference materials for agent decision-making</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="bg-gray-300 text-gray-600 cursor-not-allowed" disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                  <Lock className="h-3 w-3 ml-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Total Articles</p>
              <p className="text-2xl font-bold">42</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Total Documents</p>
              <p className="text-2xl font-bold">18</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Indexed by Agents</p>
              <p className="text-2xl font-bold">22</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="articles" className="w-full">
          <TabsList>
            <TabsTrigger value="articles">Knowledge Articles</TabsTrigger>
            <TabsTrigger value="documents">Reference Documents</TabsTrigger>
            <TabsTrigger value="policies">Global Policies</TabsTrigger>
          </TabsList>

          {/* Knowledge Articles */}
          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Articles List */}
                <div className="space-y-2">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => setSelectedArticle(selectedArticle?.id === article.id ? null : article)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedArticle?.id === article.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-gray-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-900">{article.title}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{article.category}</Badge>
                              <Badge className={article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} >
                                {article.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-600">
                          <p>{article.views} views</p>
                          <p>{article.updated}</p>
                        </div>
                      </div>

                      {/* Agents Using This */}
                      <div className="flex flex-wrap gap-1">
                        {article.agents.map((agent, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{agent}</Badge>
                        ))}
                      </div>

                      {/* Expanded Preview */}
                      {selectedArticle?.id === article.id && (
                        <div className="mt-4 pt-4 border-t bg-white -mx-4 px-4 py-3">
                          <p className="text-sm text-gray-700 mb-3">
                            Sample content: {article.title} provides guidance on {article.category.toLowerCase()} standards that agents follow during underwriting and decision-making...
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" /> View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" /> Export
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reference Documents */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Uploaded Documents</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" className="bg-gray-300 text-gray-600 cursor-not-allowed" disabled>
                          <Upload className="h-4 w-4 mr-2" /> Upload
                          <Lock className="h-3 w-3 ml-1" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-600">{doc.type} • {doc.size} • Uploaded {doc.uploadedAt}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Global Policies */}
          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>Global Policies & Guardrails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Data Provenance & Audit Trail</p>
                      <p className="text-sm text-gray-700">All agent decisions must be traceable to source documents with confidence scores</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">DSCR Firm Lock Guardrails</p>
                      <p className="text-sm text-gray-700">No firm lock without verified DSCR ≥ 1.20x. All income sources must be documented.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Confidence-Based Routing</p>
                      <p className="text-sm text-gray-700">Document confidence &lt; 75% routes to human review. No auto-approval below threshold.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">PII Encryption</p>
                      <p className="text-sm text-gray-700">All SSN, DOB, account data encrypted with AES-256. Logged access tracked immutably.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">Connector Idempotency</p>
                      <p className="text-sm text-gray-700">Third-party API calls (Zillow, Plaid, OFAC) use idempotency keys to prevent duplicates.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}