import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, FileText, MessageSquare, ClipboardList, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import PortalProgressBar from '@/components/portal/PortalProgressBar';
import PortalDocumentsTab from '@/components/portal/PortalDocumentsTab';
import PortalSecureMessaging from '@/components/portal/PortalSecureMessaging';
import PortalRequirementsTab from '@/components/portal/PortalRequirementsTab';

export default function BorrowerPortal() {
  const [activeTab, setActiveTab] = useState('status');
  const [sessionId, setSessionId] = useState(null);
  const [dealId, setDealId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setSessionId(urlParams.get('sessionId'));
    }
  }, []);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['portalSession', sessionId],
    queryFn: async () => {
      const response = await base44.functions.invoke('portalAuth', {
        action: 'getSession',
        sessionId,
      });
      return response.data;
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (session?.dealId) {
      setDealId(session.dealId);
    }
  }, [session]);

  const { data: deal, isLoading: loadingDeal } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: async () => {
      if (!sessionId || !dealId) return null;
      const response = await base44.functions.invoke('portalSummary', {
        sessionId,
      });
      return response.data;
    },
    enabled: !!sessionId && !!dealId,
  });

  const { data: requirements } = useQuery({
    queryKey: ['borrower-requirements', dealId],
    queryFn: async () => {
      if (!sessionId) return {};
      const response = await base44.functions.invoke('portalRequirements', {
        sessionId,
      });
      return response.data?.requirements_by_category || {};
    },
    enabled: !!sessionId,
  });

  const { data: messages } = useQuery({
    queryKey: ['borrower-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const response = await base44.functions.invoke('portalMessages', {
        sessionId,
        action: 'getMessages',
      });
      return response.data?.messages || [];
    },
    enabled: !!sessionId,
  });

  if (loadingSession || loadingDeal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!sessionId || !session) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900 mb-2">Session Expired</p>
            <p className="text-slate-600 mb-6">Your portal session has expired. Please request a new access link.</p>
            <Button onClick={() => (window.location.href = '/BorrowerPortalLogin')} className="w-full bg-red-600 hover:bg-red-700">
              Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageProgress = {
    inquiry: 10,
    application: 25,
    processing: 50,
    underwriting: 75,
    approved: 90,
    closing: 95,
    funded: 100,
  };

  const progress = stageProgress[deal?.stage] || 0;

  // Calculate requirements stats
  const allRequirements = Object.values(requirements || {}).flat();
  const completedCount = allRequirements.filter(r => r.status === 'approved').length;
  const pendingCount = allRequirements.filter(r => r.status === 'pending' || r.status === 'requested').length;
  const uploadedCount = allRequirements.filter(r => r.status === 'uploaded' || r.status === 'under_review').length;

  const tabs = [
    { id: 'status', label: 'Status', icon: ClipboardList, count: null },
    { id: 'documents', label: 'Documents', icon: FileText, count: pendingCount },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: messages?.length || 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Your Loan Application</h1>
              <p className="text-sm text-slate-600 mt-1">Deal #{deal?.deal_number || 'Loading...'}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/BorrowerPortalLogin')}
              className="text-sm"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Progress Section */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Application Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <PortalProgressBar
              stage={deal?.stage}
              progress={progress}
              stageLabel={deal?.stage?.replace(/_/g, ' ').toUpperCase()}
            />
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
                <p className="text-sm text-slate-600 mt-1">Approved</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{uploadedCount}</div>
                <p className="text-sm text-slate-600 mt-1">Under Review</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{pendingCount}</div>
                <p className="text-sm text-slate-600 mt-1">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {pendingCount > 0 && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Action Required</p>
              <p className="text-sm text-amber-800 mt-1">You have {pendingCount} pending document requirement{pendingCount !== 1 ? 's' : ''}. Please upload them as soon as possible to keep your application moving.</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full font-semibold ${
                    isActive ? 'bg-blue-500' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'status' && (
            <PortalRequirementsTab requirements={requirements} sessionId={sessionId} />
          )}
          {activeTab === 'documents' && (
            <PortalDocumentsTab sessionId={sessionId} />
          )}
          {activeTab === 'messages' && (
            <PortalSecureMessaging sessionId={sessionId} />
          )}
        </div>
      </div>
    </div>
  );
}