import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, AlertCircle, CheckCircle2, Clock, Mail, CheckSquare } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function AdminPortalPreview() {
  const { dealId } = useParams();
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [reviewingDoc, setReviewingDoc] = useState(null);
  const queryClient = useQueryClient();

  const { data: portalData } = useQuery({
    queryKey: ['portalPreview', dealId],
    queryFn: () => base44.functions.invoke('portalPreview', { deal_id: dealId }),
    enabled: !!dealId
  });

  const requestDocsMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('requestDocuments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalPreview', dealId] });
    }
  });

  const reviewDocMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('reviewDocument', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalPreview', dealId] });
      setReviewingDoc(null);
    }
  });

  if (!portalData?.data) {
    return <div className="p-6 text-center">Loading portal preview...</div>;
  }

  const { borrower_view, internal_view } = portalData.data;
  const borrowerReqs = borrower_view.requirements_by_category;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Portal Preview (Borrower View)</h1>
          <p className="text-gray-600 mt-2">Internal LO view with controls</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Loan Product</p>
          <p className="text-lg font-bold">{internal_view.deal_summary.loan_product}</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Borrower View</TabsTrigger>
          <TabsTrigger value="documents">Document Review</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Borrower Overview (Exact Same as Borrower Sees) */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Requirements Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{borrower_view.total_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{borrower_view.completed_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-orange-600">{borrower_view.total_count - borrower_view.completed_count}</p>
                </div>
              </div>

              {/* Internal Control: Request Docs Button */}
              {internal_view.internalControls.can_request_docs && (
                <Button
                  onClick={() => {
                    const reqIds = Object.values(borrowerReqs).flat().filter(r => r.status === 'pending').map(r => r.id);
                    if (reqIds.length > 0) {
                      requestDocsMutation.mutate({
                        deal_id: dealId,
                        requirement_ids: reqIds,
                        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        notify: true
                      });
                    }
                  }}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Request All Pending Docs
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Borrower Sees This */}
          {Object.entries(borrowerReqs).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map(req => (
                  <div key={req.id} className="p-3 border rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{req.name}</h4>
                        {req.due_at && (
                          <p className="text-xs text-gray-600 mt-1">Due: {new Date(req.due_at).toLocaleDateString()}</p>
                        )}
                      </div>
                      <Badge>{req.status}</Badge>
                    </div>
                    {req.instructions && (
                      <p className="text-sm text-gray-600 mt-2">{req.instructions}</p>
                    )}

                    {/* Internal Control: Status Controls */}
                    {internal_view.internalControls.can_request_docs && req.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => {
                          requestDocsMutation.mutate({
                            deal_id: dealId,
                            requirement_ids: [req.id],
                            due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            notify: true
                          });
                        }}
                      >
                        Request
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Document Review (Internal Control) */}
        <TabsContent value="documents" className="space-y-4">
          {Object.values(borrowerReqs).flat().map(req => (
            req.documents?.map(doc => (
              <Card key={doc.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-xs text-gray-600">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <Badge>{doc.status}</Badge>
                  </div>

                  {/* Internal Review Controls */}
                  {internal_view.internalControls.can_approve_docs && ['uploaded', 'under_review'].includes(doc.status) && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          reviewDocMutation.mutate({
                            document_id: doc.id,
                            status: 'approved',
                            reviewer_notes: 'Approved by LO'
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setReviewingDoc(doc.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ))}
        </TabsContent>

        {/* Messages (Borrower Sees This) */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portal Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {borrower_view.messages?.map(msg => (
                <div key={msg.id} className={`p-3 rounded-lg ${msg.direction === 'Inbound' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <p className="text-xs text-gray-600">{new Date(msg.created_at).toLocaleDateString()}</p>
                  <p className="text-sm mt-2">{msg.body}</p>
                </div>
              )) || <p className="text-gray-600">No messages</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}