import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, Upload, MessageSquare, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function BorrowerPortalHome() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [dealId, setDealId] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setDealId(urlParams.get('deal_id'));
    }
  }, []);

  const { data: summary } = useQuery({
    queryKey: ['portalSummary', dealId],
    queryFn: () => base44.functions.invoke('portalSummary', { deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: requirements } = useQuery({
    queryKey: ['portalRequirements', dealId],
    queryFn: () => base44.functions.invoke('portalRequirements', { deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: messages } = useQuery({
    queryKey: ['portalMessages', dealId],
    queryFn: () => base44.functions.invoke('portalMessages', { deal_id: dealId }),
    enabled: !!dealId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Get user's org membership
  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id || user?.org_id;

  const { data: deals = [] } = useQuery({
    queryKey: ['availableDeals', orgId],
    queryFn: async () => {
      try {
        if (orgId) {
          return await base44.entities.Deal.filter({ org_id: orgId, status: 'active' });
        }
        const allDeals = await base44.entities.Deal.list();
        return allDeals.filter(d => d.status === 'active');
      } catch (e) {
        try {
          const allDeals = await base44.entities.Deal.list();
          return allDeals.filter(d => d.status === 'active');
        } catch {
          return [];
        }
      }
    },
    enabled: true,
  });

  const handleSelectDeal = (id) => {
    window.location.search = `?deal_id=${id}`;
  };

  if (!dealId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold">Borrower Portal - Select Loan</h1>
            <p className="text-gray-600 mt-2">View and manage loan applications from the borrower's perspective</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {deals.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600">No active loan applications found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deals.map((deal) => (
                <Card key={deal.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectDeal(deal.id)}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-2">{deal.deal_number}</h3>
                    <p className="text-sm text-gray-600 mb-3">{deal.loan_product}</p>
                    <p className="text-sm font-medium">${(deal.loan_amount / 1000).toFixed(0)}K</p>
                    <Badge className="mt-2" variant="secondary">{deal.stage?.replace(/_/g, ' ')}</Badge>
                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">View Borrower Portal</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">Your Loan Application</h1>
          <p className="text-gray-600 mt-2">Track documents, messages, and next steps</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Progress Overview */}
        {summary?.data && (
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Stage</p>
                  <p className="text-2xl font-bold mt-1">{summary.data.stage || 'Application'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding Documents</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">{summary.data.outstanding_docs || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{summary.data.completed_docs || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary?.data?.next_steps?.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">{step}</p>
                    </div>
                  </div>
                )) || <p className="text-gray-600">No pending steps</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {requirements?.data?.requirements_by_category && Object.entries(requirements.data.requirements_by_category).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map(req => (
                    <div key={req.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{req.name}</h4>
                        <Badge variant={
                          req.status === 'approved' ? 'default' :
                          req.status === 'uploaded' ? 'secondary' :
                          req.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {req.status}
                        </Badge>
                      </div>
                      {req.instructions && (
                        <p className="text-sm text-gray-600 mb-3">{req.instructions}</p>
                      )}
                      {req.status === 'rejected' && req.reviewer_notes && (
                        <p className="text-sm text-red-600 mb-3">Note: {req.reviewer_notes}</p>
                      )}
                      {['pending', 'requested', 'rejected'].includes(req.status) && (
                        <Button size="sm" className="gap-2">
                          <Upload className="h-4 w-4" />
                          Upload Document
                        </Button>
                      )}
                      {req.documents?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {req.documents.map(doc => (
                            <div key={doc.id} className="text-sm flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <FileText className="h-4 w-4 text-gray-600" />
                              <span>{doc.name}</span>
                              <Badge variant="outline" className="ml-auto">{doc.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )) || <Card><CardContent className="pt-6">Loading documents...</CardContent></Card>}
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages?.data?.messages?.map(msg => (
                  <div key={msg.id} className={`p-3 rounded-lg ${msg.direction === 'Inbound' ? 'bg-blue-50 border-l-4 border-blue-600' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-600">{new Date(msg.created_at).toLocaleDateString()}</p>
                    <p className="text-sm mt-2">{msg.body}</p>
                  </div>
                )) || <p className="text-gray-600">No messages yet</p>}
                
                <div className="mt-6 pt-6 border-t">
                  <textarea
                    id="message-input"
                    placeholder="Type a message..."
                    className="w-full p-3 border rounded-lg text-sm"
                    rows="3"
                  />
                  <Button 
                    className="mt-3 bg-blue-600"
                    onClick={async () => {
                      const messageInput = document.getElementById('message-input');
                      const message = messageInput.value.trim();
                      if (!message) {
                        toast.warning('Please enter a message');
                        return;
                      }
                      try {
                        await base44.functions.invoke('portalSecureMessagingHelper', {
                          action: 'send',
                          deal_id: dealId,
                          message: message
                        });
                        messageInput.value = '';
                        toast.success('Message sent successfully!');
                      } catch (error) {
                        toast.error('Error sending message: ' + error.message);
                      }
                    }}
                  >
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}