import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, FileText, CheckCircle2, AlertCircle, MessageSquare, Home, Loader2 } from 'lucide-react';
import PortalDocumentsTab from '@/components/portal/PortalDocumentsTab';

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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Loan Portal</h1>
          <p className="text-slate-600">Status: {deal?.stage?.replace(/_/g, ' ')}</p>
        </div>

        {/* Progress */}
        <Card className="mb-6 bg-white">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider">Application Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-600">
                Status: <span className="font-semibold capitalize">{deal?.stage?.replace(/_/g, ' ')}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              <TimelineEvent
                stage="inquiry"
                label="Application Started"
                completed={true}
                current={deal?.stage === 'inquiry'}
              />
              <TimelineEvent
                stage="application"
                label="Application Submitted"
                completed={['application', 'processing', 'underwriting', 'approved', 'closing', 'funded'].includes(deal?.stage)}
                current={deal?.stage === 'application'}
              />
              <TimelineEvent
                stage="processing"
                label="Processing"
                completed={['processing', 'underwriting', 'approved', 'closing', 'funded'].includes(deal?.stage)}
                current={deal?.stage === 'processing'}
              />
              <TimelineEvent
                stage="underwriting"
                label="Underwriting Review"
                completed={['underwriting', 'approved', 'closing', 'funded'].includes(deal?.stage)}
                current={deal?.stage === 'underwriting'}
              />
              <TimelineEvent
                stage="approved"
                label="Loan Approved"
                completed={['approved', 'closing', 'funded'].includes(deal?.stage)}
                current={deal?.stage === 'approved'}
              />
              <TimelineEvent
                stage="closing"
                label="Closing"
                completed={['closing', 'funded'].includes(deal?.stage)}
                current={deal?.stage === 'closing'}
              />
              <TimelineEvent
                stage="funded"
                label="Funded"
                completed={deal?.stage === 'funded'}
                current={deal?.stage === 'funded'}
              />
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <PortalDocumentsTab sessionId={sessionId} />
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
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

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            {messages?.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-600">
                  No messages yet
                </CardContent>
              </Card>
            ) : (
              messages?.map(msg => (
                <Card key={msg.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 mb-2">{msg.body}</p>
                    <p className="text-xs text-slate-500">{new Date(msg.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))
            )}
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