import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from 'lucide-react';
import FeesTab from '@/components/deal-detail/FeesTab';

export default function DealDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');

  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      const deals = await base44.entities.Deal.filter({ id: dealId });
      return deals[0];
    },
    enabled: !!dealId,
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['deal-properties', dealId],
    queryFn: () => base44.entities.Property.filter({ deal_id: dealId }),
    enabled: !!dealId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['deal-documents', dealId],
    queryFn: () => base44.entities.Document.filter({ deal_id: dealId }),
    enabled: !!dealId,
  });

  const { data: conditions = [] } = useQuery({
    queryKey: ['deal-conditions', dealId],
    queryFn: () => base44.entities.Condition.filter({ deal_id: dealId }),
    enabled: !!dealId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['deal-tasks', dealId],
    queryFn: () => base44.entities.Task.filter({ deal_id: dealId }),
    enabled: !!dealId,
  });

  const property = properties[0];

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

  if (dealLoading || !deal) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to={createPageUrl('Deals')}>
          <Button variant="ghost" className="mb-4 text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Button>
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
              {deal.loan_type?.replace(/_/g, ' ')} • ${(deal.loan_amount || 0).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card className="border-gray-200 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Deal Progress</span>
            <span className="text-sm text-gray-500">{Math.round(getStageProgress(deal.status))}%</span>
          </div>
          <Progress value={getStageProgress(deal.status)} className="h-2" />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">Loan Amount</div>
            <div className="text-xl font-semibold text-gray-900">
              ${(deal.loan_amount || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">Interest Rate</div>
            <div className="text-xl font-semibold text-gray-900">
              {deal.interest_rate ? `${deal.interest_rate}%` : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">LTV</div>
            <div className="text-xl font-semibold text-gray-900">
              {deal.ltv_ratio ? `${deal.ltv_ratio.toFixed(1)}%` : '-'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">DSCR</div>
            <div className={`text-xl font-semibold ${
              deal.dscr_ratio >= 1.25 ? 'text-green-600' : 
              deal.dscr_ratio >= 1.0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {deal.dscr_ratio ? deal.dscr_ratio.toFixed(2) : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="terms">Loan Terms</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="documents">Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="conditions">Conditions ({conditions.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
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
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium capitalize">{deal.loan_type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Purpose</span>
                  <span className="font-medium capitalize">{deal.loan_purpose?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Term</span>
                  <span className="font-medium">{deal.loan_term_months ? `${deal.loan_term_months / 12} years` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly P&I</span>
                  <span className="font-medium">${deal.monthly_pi?.toLocaleString() || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Monthly</span>
                  <span className="font-medium">${deal.total_monthly_payment?.toLocaleString() || '-'}</span>
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
                      <span className="font-medium">${property.monthly_rent?.toLocaleString() || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Annual Taxes</span>
                      <span className="font-medium">${property.annual_taxes?.toLocaleString() || '-'}</span>
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
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="pb-4 border-l-2 border-gray-200 pl-4 relative">
                  <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-blue-500" />
                  <p className="text-sm font-medium">Deal created</p>
                  <p className="text-xs text-gray-500 mt-1">Today at 9:30 AM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Documents</CardTitle>
              <Button variant="outline" size="sm">Upload Document</Button>
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
        </TabsContent>

        <TabsContent value="conditions">
          <Card className="border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Conditions</CardTitle>
              <Button variant="outline" size="sm">Add Condition</Button>
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
              <p className="text-gray-500 text-center py-8">Borrower information coming soon</p>
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
                          <p className="font-medium">${(property.monthly_rent || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Annual Taxes</p>
                          <p className="font-medium">${(property.annual_taxes || 0).toLocaleString()}</p>
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
      </Tabs>
    </div>
  );
}