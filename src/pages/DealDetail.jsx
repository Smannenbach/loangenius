import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MISMOExportPanel from '@/components/deal-detail/MISMOExportPanel';
import MISMOImportPanel from '@/components/deal-detail/MISMOImportPanel';
import UnderwritingTab from '@/components/deal-detail/UnderwritingTab';
import CommunicationsTab from "../components/deal-detail/CommunicationsTab";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  DollarSign,
  Home,
  User,
  FileText,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  Calendar,
  Building2,
  MapPin,
  Phone,
  Mail,
  Download,
  Edit,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Eye,
  RotateCcw,
  FileCode,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import FeesTab from '@/components/deal-detail/FeesTab';
import DealCalculator from '@/components/deal-wizard/DealCalculator';
import DealStatusUpdate from '@/components/deal-detail/DealStatusUpdate';
import TasksTab from '@/components/deal-detail/TasksTab';
import SubmitToLenderModal from '@/components/deal-detail/SubmitToLenderModal';
import DocumentGenerator from '@/components/documents/DocumentGenerator';
import SmartDocumentReview from '@/components/documents/SmartDocumentReview';
import LenderSyncPanel from '@/components/lender/LenderSyncPanel';
import LenderOutreachPanel from '@/components/deal-detail/LenderOutreachPanel';
import OfferLetterGenerator from '@/components/deal-detail/OfferLetterGenerator';
import ExportDealPDFModal from '@/components/deal-detail/ExportDealPDFModal';
import UploadDocumentModal from '@/components/deal-detail/UploadDocumentModal';
import AddConditionModal from '@/components/deal-detail/AddConditionModal';
import SendForSignatureModal from '@/components/deal-detail/SendForSignatureModal';
import EnvelopeStatusCard from '@/components/deal-detail/EnvelopeStatusCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSignature } from 'lucide-react';

export default function DealDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  const navigate = useNavigate();
  const [showPortalInviteModal, setShowPortalInviteModal] = useState(false);
  const [showSubmitToLenderModal, setShowSubmitToLenderModal] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [showExportPDFModal, setShowExportPDFModal] = useState(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [showAddConditionModal, setShowAddConditionModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      const deals = await base44.entities.Deal.list();
      return deals.find(d => d.id === dealId);
    },
    enabled: !!dealId,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['deal-properties', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        const dealProps = await base44.entities.DealProperty.filter({ deal_id: dealId });
        const propertyIds = dealProps.map(dp => dp.property_id);
        if (!propertyIds.length) {
          // Try fetching properties directly linked to deal
          return await base44.entities.Property.filter({ deal_id: dealId });
        }
        const props = await base44.entities.Property.filter({ id: { $in: propertyIds } });
        return props;
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const { data: borrowers = [] } = useQuery({
    queryKey: ['deal-borrowers', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        const dealBorrs = await base44.entities.DealBorrower.filter({ deal_id: dealId });
        const borrowerIds = dealBorrs.map(db => db.borrower_id);
        if (!borrowerIds.length) return [];
        const borrs = await base44.entities.Borrower.filter({ id: { $in: borrowerIds } });
        return borrs.map(b => ({
          ...b,
          dealRole: dealBorrs.find(db => db.borrower_id === b.id)?.role
        }));
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['deal-documents', dealId],
    queryFn: async () => {
      try {
        return await base44.entities.Document.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const { data: conditions = [] } = useQuery({
    queryKey: ['deal-conditions', dealId],
    queryFn: async () => {
      try {
        return await base44.entities.Condition.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['deal-tasks', dealId],
    queryFn: async () => {
      try {
        return await base44.entities.Task.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  const property = properties[0];

  const sendPortalInviteMutation = useMutation({
    mutationFn: async (borrowerId) => {
      const response = await base44.functions.invoke('portalMagicLink', {
        action: 'sendInvite',
        org_id: deal?.org_id,
        deal_id: dealId,
        borrower_id: borrowerId,
      });
      return response.data;
    },
  });

  // Use production MISMO orchestrator instead of simplified generateMISMO34
  const exportMISMOMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('mismoExportOrchestrator', { 
        deal_id: dealId,
        export_mode: 'GENERIC_MISMO_34',
        skip_preflight: false
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.success && data?.xml_content) {
        const blob = new Blob([data.xml_content], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename || `MISMO_34_${dealId}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (data.export_run?.status === 'completed') {
          toast.success('MISMO 3.4 XML exported successfully');
        } else if (data.export_run?.status === 'completed_with_warnings') {
          toast.warning('Export completed with warnings');
        }
      } else if (!data?.success) {
        toast.error(`Export blocked: ${data?.blocked_reason || 'Validation failed'}`);
      }
    },
    onError: (error) => {
      toast.error('MISMO export failed: ' + error.message);
    },
  });

  const getStatusColor = (status) => {
    const colors = {
      lead: 'bg-gray-100 text-gray-700',
      application: 'bg-blue-100 text-blue-700',
      processing: 'bg-yellow-100 text-yellow-700',
      underwriting: 'bg-purple-100 text-purple-700',
      conditional_approval: 'bg-indigo-100 text-indigo-700',
      clear_to_close: 'bg-emerald-100 text-emerald-700',
      closing: 'bg-teal-100 text-teal-700',
      funded: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStageProgress = (status) => {
    const stages = ['lead', 'application', 'processing', 'underwriting', 'conditional_approval', 'clear_to_close', 'closing', 'funded'];
    const index = stages.indexOf(status);
    return index >= 0 ? ((index + 1) / stages.length) * 100 : 0;
  };

  if (!dealId) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No Deal Selected</h2>
          <p className="text-gray-500 mb-4">Please select a deal from the pipeline to view details.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Link to={createPageUrl('Pipeline')}>
              <Button>Go to Pipeline</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (dealLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
          <div className="flex justify-between items-start">
            <div>
              <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 rounded w-24" />
              <div className="h-10 bg-gray-200 rounded w-24" />
              <div className="h-10 bg-gray-200 rounded w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded-lg" />
            <div className="h-48 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (dealError || !deal) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Deal Not Found</h2>
          <p className="text-gray-500 mb-4">The deal you're looking for doesn't exist or couldn't be loaded.</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            <Link to={createPageUrl('Pipeline')}>
              <Button>Go to Pipeline</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link 
          to={createPageUrl('Deals')}
          className="inline-flex items-center text-gray-600 hover:text-gray-800 font-medium mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {deal.deal_number || 'Draft Deal'}
              </h1>
              <Badge className={getStatusColor(deal.status)}>
                {deal.status?.replace(/_/g, ' ')}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1 capitalize">
              {deal.loan_product?.replace(/_/g, ' ')} • ${(deal.loan_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => exportMISMOMutation.mutate()}
              disabled={exportMISMOMutation.isPending}
              data-testid="cta:DealDetail:ExportMISMO"
            >
              {exportMISMOMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileCode className="h-4 w-4" />
              )}
              MISMO 3.4
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowExportPDFModal(true)}
              data-testid="cta:DealDetail:ExportPDF"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button asChild variant="outline" className="gap-2" data-testid="cta:DealDetail:Edit">
              <Link to={createPageUrl(`DealWizard?id=${dealId}`)}>
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button 
              variant="outline"
              className="gap-2"
              onClick={() => setShowSignatureModal(true)}
              data-testid="cta:DealDetail:SendForSignature"
            >
              <FileSignature className="h-4 w-4" />
              Send for Signature
            </Button>
            <Button 
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => setShowSubmitToLenderModal(true)}
              data-testid="cta:DealDetail:SubmitToLenders"
            >
              <Send className="h-4 w-4" />
              Submit to Lenders
            </Button>
          </div>
        </div>
      </div>

      {/* Status Update */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <DealStatusUpdate deal={deal} dealId={dealId} />
        </div>
      </div>

      {/* Calculator */}
      <div className="mb-6">
        <DealCalculator deal={deal} properties={properties} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="terms">Loan Terms</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="conditions">Conditions ({conditions.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="lenders">Lenders</TabsTrigger>
          <TabsTrigger value="underwriting">Underwriting</TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
          <TabsTrigger value="mismo">MISMO</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Loan Details */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Product</span>
                  <span className="font-medium capitalize">{deal.loan_product?.replace(/_/g, ' ') || 'DSCR'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Purpose</span>
                  <span className="font-medium capitalize">{deal.loan_purpose?.replace(/_/g, ' ') || 'Purchase'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium">${(deal.loan_amount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rate</span>
                  <span className="font-medium">{deal.interest_rate || '-'}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Term</span>
                  <span className="font-medium">{deal.loan_term_months ? `${deal.loan_term_months / 12} years` : '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Property Details */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="h-5 w-5 text-emerald-600" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                {property ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <div className="font-medium">{property.address_street}</div>
                        <div className="text-gray-500 text-sm">
                          {property.address_city}, {property.address_state} {property.address_zip}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium capitalize">{property.property_type?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monthly Rent</span>
                      <span className="font-medium">${property.gross_rent_monthly?.toLocaleString() || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monthly Taxes</span>
                      <span className="font-medium">${(property.taxes_monthly * 12)?.toLocaleString() || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No property added</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fees">
          <FeesTab dealId={dealId} deal={deal} />
        </TabsContent>

        <TabsContent value="activity">
           <CommunicationsTab 
             dealId={dealId} 
             borrowerEmail={borrowers[0]?.email || borrowers[0]?.cell_phone}
             borrowerPhone={borrowers[0]?.cell_phone || borrowers[0]?.home_phone}
           />
        </TabsContent>

        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Documents</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowSignatureModal(true)}
                    >
                      <FileSignature className="h-4 w-4 mr-2" />
                      Send for Signature
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowUploadDocModal(true)}
                      data-testid="cta:DealDetail:UploadDocument"
                    >
                      Upload Document
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p>No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium">{doc.name}</div>
                              <div className="text-sm text-gray-500 capitalize">{doc.document_type?.replace(/_/g, ' ')}</div>
                            </div>
                          </div>
                          <Badge className={doc.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <EnvelopeStatusCard dealId={dealId} />
              <DocumentGenerator dealId={dealId} deal={deal} />
              <SmartDocumentReview dealId={dealId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="conditions">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Conditions</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddConditionModal(true)}
                data-testid="cta:DealDetail:AddCondition"
              >
                Add Condition
              </Button>
            </CardHeader>
            <CardContent>
              {conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No conditions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition) => (
                    <div key={condition.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        {condition.status === 'approved' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                        )}
                        <div>
                          <div className="font-medium">{condition.description}</div>
                          <div className="text-sm text-gray-500 capitalize">{condition.condition_type}</div>
                        </div>
                      </div>
                      <Badge className={condition.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                        {condition.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowers">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Borrowers & Entities</CardTitle>
            </CardHeader>
            <CardContent>
              {borrowers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No borrowers added</p>
              ) : (
                <div className="space-y-3">
                  {borrowers.map((borrower) => (
                    <div key={borrower.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {borrower.first_name && borrower.last_name
                            ? `${borrower.first_name} ${borrower.last_name}`
                            : borrower.entity_name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {borrower.email && <div>{borrower.email}</div>}
                          {borrower.phone && <div>{borrower.phone}</div>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600 capitalize">
                          {borrower.dealRole?.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {borrower.borrower_type === 'individual' ? 'Individual' : 'Entity'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="property">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              {property ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Subject Property</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{property.address_street}</div>
                          <div className="text-gray-500 text-sm">
                            {property.address_city}, {property.address_state} {property.address_zip}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-sm text-gray-500">Property Type</p>
                          <p className="font-medium capitalize">{property.property_type?.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Year Built</p>
                          <p className="font-medium">{property.year_built || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Bedrooms</p>
                          <p className="font-medium">{property.bedrooms || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Bathrooms</p>
                          <p className="font-medium">{property.bathrooms || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Monthly Rent</p>
                          <p className="font-medium">${(property.gross_rent_monthly || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Annual Taxes</p>
                          <p className="font-medium">${((property.taxes_monthly || 0) * 12).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No property added</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Loan Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Loan Amount</p>
                  <p className="font-semibold mt-1">${(deal.loan_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Interest Rate</p>
                  <p className="font-semibold mt-1">{deal.interest_rate || '-'}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Loan Term</p>
                  <p className="font-semibold mt-1">{deal.loan_term_months ? `${deal.loan_term_months / 12} years` : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rate Type</p>
                  <p className="font-semibold mt-1">Fixed</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Monthly P&I</p>
                  <p className="font-semibold mt-1">${(deal.monthly_pi || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prepayment</p>
                  <p className="font-semibold mt-1">5-4-3-2-1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <TasksTab dealId={dealId} orgId={deal.org_id} tasks={tasks} />
        </TabsContent>

        <TabsContent value="lenders">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LenderOutreachPanel dealId={dealId} deal={deal} />
            </div>
            <LenderSyncPanel dealId={dealId} orgId={deal?.org_id} />
          </div>
        </TabsContent>

        <TabsContent value="portal" className="space-y-6">
          {/* AI Offer Generator */}
          <OfferLetterGenerator 
            dealId={dealId} 
            deal={deal} 
            borrower={borrowers[0]}
            onSend={() => toast.success('Offer sent!')}
          />

          <Card>
            <CardHeader>
              <CardTitle>Borrower Portal Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {borrowers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No borrowers added</p>
              ) : (
                borrowers.map((borrower) => (
                  <div key={borrower.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{borrower.first_name} {borrower.last_name}</p>
                        <p className="text-sm text-gray-600">{borrower.email}</p>
                        <p className="text-sm text-gray-600">{borrower.phone}</p>
                      </div>
                      <Badge>{borrower.dealRole || 'Borrower'}</Badge>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedBorrower(borrower.id);
                        setShowPortalInviteModal(true);
                      }}>
                        <Send className="h-4 w-4 mr-2" />
                        Send Invite
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(createPageUrl(`BorrowerPortalHome?deal_id=${dealId}`), '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedBorrower(borrower.id);
                          sendPortalInviteMutation.mutate(borrower.id);
                          toast.success('Invite resent!');
                        }}
                        disabled={sendPortalInviteMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Resend
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No documents uploaded</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="border-b py-3 last:border-0 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.name || doc.document_type}</p>
                      <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'}>
                        {doc.status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="underwriting">
          <UnderwritingTab dealId={dealId} deal={deal} />
        </TabsContent>

        <TabsContent value="mismo">
          <div className="space-y-6">
            <MISMOExportPanel dealId={dealId} />
            <MISMOImportPanel dealId={dealId} />
          </div>
        </TabsContent>
      </Tabs>

      {showPortalInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Send Portal Invite</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Sending invite to {borrowers?.find(b => b.id === selectedBorrower)?.email}
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Send via Email</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Send via SMS</span>
                </label>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPortalInviteModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    sendPortalInviteMutation.mutate(selectedBorrower);
                    setShowPortalInviteModal(false);
                  }}
                  className="bg-blue-600"
                  disabled={sendPortalInviteMutation.isPending}
                >
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <SubmitToLenderModal 
        dealId={dealId}
        open={showSubmitToLenderModal}
        onOpenChange={setShowSubmitToLenderModal}
      />

      <ExportDealPDFModal
        dealId={dealId}
        deal={deal}
        open={showExportPDFModal}
        onOpenChange={setShowExportPDFModal}
      />

      <UploadDocumentModal
        dealId={dealId}
        orgId={deal.org_id}
        open={showUploadDocModal}
        onOpenChange={setShowUploadDocModal}
      />

      <AddConditionModal
        dealId={dealId}
        orgId={deal.org_id}
        open={showAddConditionModal}
        onOpenChange={setShowAddConditionModal}
      />

      <Dialog open={showSignatureModal} onOpenChange={setShowSignatureModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-blue-600" />
              Send Documents for Signature
            </DialogTitle>
          </DialogHeader>
          <SendForSignatureModal 
            dealId={dealId} 
            onClose={() => setShowSignatureModal(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}