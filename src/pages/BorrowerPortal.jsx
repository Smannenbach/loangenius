import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, FileText, CheckCircle2, AlertCircle, MessageSquare, Home, Loader2 } from 'lucide-react';
import PortalDocumentsTab from '@/components/portal/PortalDocumentsTab';
import PortalStatusTracker from '@/components/portal/PortalStatusTracker';
import PortalSecureMessaging from '@/components/portal/PortalSecureMessaging';

export default function BorrowerPortal() {
  const [activeTab, setActiveTab] = useState('timeline');
  const [sessionId, setSessionId] = useState(null);
  const [dealId, setDealId] = useState(null);
  const [borrowerId, setBorrowerId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setSessionId(urlParams.get('sessionId'));
    }
  }, []);

  // Get session data
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
    if (session) {
      setDealId(session.dealId);
      setBorrowerId(session.borrowerId);
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

  const { data: tasks } = useQuery({
    queryKey: ['borrower-tasks', dealId],
    queryFn: async () => {
      if (!sessionId) return [];
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!sessionId || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Session Invalid</p>
            <p className="text-gray-600 mb-4">Your portal session has expired or is invalid.</p>
            <Button onClick={() => (window.location.href = '/BorrowerPortalLogin')}>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Loan Application</h1>
          <p className="text-slate-600">Track your application status, upload documents, and communicate securely</p>
        </div>

        {/* Real-Time Status Tracker */}
        <div className="mb-8">
          <PortalStatusTracker sessionId={sessionId} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <PortalDocumentsTab sessionId={sessionId} />
          </TabsContent>

          {/* Secure Messaging Tab */}
          <TabsContent value="messages" className="space-y-4">
            <PortalSecureMessaging sessionId={sessionId} />
          </TabsContent>

          {/* Requirements Tab */}
          <TabsContent value="requirements" className="space-y-4">
            {Object.entries(tasks || {}).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-lg font-semibold mb-3 capitalize">{category}</h3>
                {items.map(task => (
                  <Card key={task.id} className="mb-3">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{task.name || task.display_name}</span>
                        <StatusBadge status={task.status} />
                      </CardTitle>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TimelineEvent({ stage, label, completed, current }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
          completed ? 'bg-green-100' : current ? 'bg-blue-100' : 'bg-slate-100'
        }`}>
          {completed ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : current ? (
            <Clock className="h-6 w-6 text-blue-600 animate-pulse" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-slate-300" />
          )}
        </div>
        {false && <div className="w-1 h-12 bg-slate-200 my-1" />}
      </div>
      <div className="flex-1 pt-2">
        <p className={`font-medium ${completed || current ? 'text-slate-900' : 'text-slate-500'}`}>
          {label}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    uploaded: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-slate-100'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}