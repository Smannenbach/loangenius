import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, FileText, CheckCircle2, AlertCircle, MessageSquare, Home } from 'lucide-react';

export default function BorrowerPortal() {
  const { dealId } = useParams();
  const [activeTab, setActiveTab] = useState('timeline');

  const { data: deal, isLoading: loadingDeal } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => base44.entities.Deal.filter({ id: dealId }).then(d => d[0])
  });

  const { data: tasks } = useQuery({
    queryKey: ['borrower-tasks', dealId],
    queryFn: () => base44.entities.Task.filter({ deal_id: dealId, is_visible_to_borrower: true })
  });

  const { data: documents } = useQuery({
    queryKey: ['borrower-documents', dealId],
    queryFn: () => base44.entities.DealDocumentRequirement.filter({ deal_id: dealId })
  });

  const { data: messages } = useQuery({
    queryKey: ['borrower-messages', dealId],
    queryFn: () => base44.entities.Communication.filter({ deal_id: dealId })
  });

  if (loadingDeal) return <div className="p-8">Loading...</div>;

  const stageProgress = {
    inquiry: 10,
    application: 25,
    processing: 50,
    underwriting: 75,
    approved: 90,
    closing: 95,
    funded: 100
  };

  const progress = stageProgress[deal?.stage] || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Loan Portal</h1>
          <p className="text-slate-600">Deal: {deal?.deal_number}</p>
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
            {documents?.map(doc => (
              <Card key={doc.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {doc.name}
                    </CardTitle>
                    {doc.instructions_text && (
                      <p className="text-sm text-slate-600 mt-2">{doc.instructions_text}</p>
                    )}
                  </div>
                  <StatusBadge status={doc.status} />
                </CardHeader>
              </Card>
            ))}
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            {tasks?.map(task => (
              <Card key={task.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{task.title}</span>
                    <StatusBadge status={task.status} />
                  </CardTitle>
                  {task.description && <p className="text-sm text-slate-600">{task.description}</p>}
                </CardHeader>
                {task.due_date && (
                  <CardContent>
                    <p className="text-sm text-slate-500">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            {messages?.map(msg => (
              <Card key={msg.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {msg.subject}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700 mb-2">{msg.body}</p>
                  <p className="text-xs text-slate-500">{new Date(msg.sent_at).toLocaleString()}</p>
                </CardContent>
              </Card>
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