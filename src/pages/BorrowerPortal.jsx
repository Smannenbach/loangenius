import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, FileText, MessageSquare, ClipboardList, CheckCircle2, Clock, AlertTriangle, Home, ListChecks } from 'lucide-react';
import PortalProgressBar from '@/components/portal/PortalProgressBar';
import PortalDocumentsTab from '@/components/portal/PortalDocumentsTab';
import PortalSecureMessaging from '@/components/portal/PortalSecureMessaging';
import PortalRequirementsTab from '@/components/portal/PortalRequirementsTab';
import PortalConditionsTab from '@/components/portal/PortalConditionsTab';
import PortalLoanSummary from '@/components/portal/PortalLoanSummary';
import PortalNotificationBell from '@/components/portal/PortalNotificationBell';
import PortalDashboard from '@/components/portal/PortalDashboard';

export default function BorrowerPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
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

  // Fetch conditions
  const { data: conditions = [] } = useQuery({
    queryKey: ['portalConditions', dealId],
    queryFn: async () => {
      if (!dealId) return [];
      try {
        return await base44.entities.Condition.filter({ deal_id: dealId });
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
  });

  // Fetch property
  const { data: property } = useQuery({
    queryKey: ['portalProperty', dealId],
    queryFn: async () => {
      if (!dealId) return null;
      try {
        const dealProperties = await base44.entities.DealProperty.filter({ deal_id: dealId });
        if (dealProperties.length > 0) {
          const properties = await base44.entities.Property.filter({ id: dealProperties[0].property_id });
          return properties[0];
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!dealId,
  });

  const pendingConditionsCount = conditions.filter(c => !c.borrower_acknowledged && c.status === 'pending').length;

  // Calculate unread messages
  const unreadMessagesCount = messages?.filter(m => m.direction === 'inbound' && !m.read_by_recipient)?.length || 0;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, count: null, badge: false },
    { id: 'summary', label: 'Loan Details', icon: FileText, count: null, badge: false },
    { id: 'status', label: 'Documents', icon: FileText, count: pendingCount, badge: pendingCount > 0 },
    { id: 'conditions', label: 'Conditions', icon: ListChecks, count: pendingConditionsCount, badge: pendingConditionsCount > 0 },
    { id: 'messages', label: 'Messages', icon: MessageSquare, count: unreadMessagesCount || messages?.length || 0, badge: unreadMessagesCount > 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Loan Application</h1>
                <p className="text-xs text-slate-500 mt-0.5">ID: {deal?.deal_number || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PortalNotificationBell 
                sessionId={sessionId} 
                dealId={dealId}
                onNavigate={(tab) => setActiveTab(tab)}
              />
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
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Progress Overview Card */}
        <Card className="border-slate-200 shadow-md mb-6">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Progress Bar */}
              <PortalProgressBar
                stage={deal?.stage}
                progress={progress}
                stageLabel={deal?.stage?.replace(/_/g, ' ').toUpperCase()}
              />
              
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold text-green-700">{completedCount}</div>
                      <p className="text-xs text-green-600 font-medium">Approved</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold text-orange-700">{uploadedCount}</div>
                      <p className="text-xs text-orange-600 font-medium">Under Review</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-red-700">{pendingCount}</div>
                      <p className="text-xs text-red-600 font-medium">Action Needed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Banner */}
        {pendingCount > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg shadow-sm">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Action Required</p>
                <p className="text-sm text-amber-800 mt-1">{pendingCount} document{pendingCount !== 1 ? 's' : ''} need attention. Upload them to keep your application moving.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs with Badges */}
        <div className="flex gap-1 bg-white p-1.5 rounded-lg border border-slate-200 mb-6 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-md font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`ml-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'dashboard' && (
            <PortalDashboard 
              deal={deal} 
              borrower={session?.borrower} 
              property={property}
              pendingDocs={pendingCount}
              pendingConditions={pendingConditionsCount}
              unreadMessages={unreadMessagesCount}
              onNavigate={setActiveTab}
            />
          )}
          {activeTab === 'summary' && (
            <PortalLoanSummary deal={deal} borrower={session?.borrower} property={property} />
          )}
          {activeTab === 'status' && (
            <PortalRequirementsTab requirements={requirements} sessionId={sessionId} />
          )}
          {activeTab === 'conditions' && (
            <PortalConditionsTab sessionId={sessionId} dealId={dealId} />
          )}
          {activeTab === 'messages' && (
            <PortalSecureMessaging dealId={dealId} borrowerEmail={session?.borrowerEmail} sessionId={sessionId} />
          )}
        </div>
      </div>
    </div>
  );
}