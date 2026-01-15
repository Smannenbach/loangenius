import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle2, Clock, Signature, AlertCircle } from 'lucide-react';

const urlParams = new URLSearchParams(window.location.search);
const dealId = urlParams.get('deal_id');

export default function CoborrowerPortal() {
  const [selectedTab, setSelectedTab] = useState('documents');

  const { data: deal } = useQuery({
    queryKey: ['coborrowerDeal', dealId],
    queryFn: () => base44.entities.Deal.get(dealId),
    enabled: !!dealId
  });

  const { data: envelopes } = useQuery({
    queryKey: ['coborrowerEnvelopes', dealId],
    queryFn: async () => {
      const envs = await base44.entities.DocuSignEnvelope.filter({ deal_id: dealId });
      return envs;
    },
    enabled: !!dealId
  });

  const { data: signerStatus } = useQuery({
    queryKey: ['coborrowerSignerStatus', dealId],
    queryFn: async () => {
      const statuses = await base44.entities.DocuSignEnvelopeSigner.filter({ deal_id: dealId });
      return statuses;
    },
    enabled: !!dealId
  });

  if (!dealId) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Invalid or missing deal ID</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold">Co-Borrower Portal</h1>
          <p className="text-gray-600 mt-2">Review and sign your loan documents</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Document Signing Status */}
        {envelopes && (
          <Card>
            <CardHeader>
              <CardTitle>Documents to Sign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {envelopes.map(env => (
                <div key={env.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-lg capitalize">
                        {env.document_type.replace(/_/g, ' ')}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Sent: {new Date(env.sent_at || env.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        env.status === 'completed'
                          ? 'default'
                          : env.status === 'sent'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={
                        env.status === 'completed' ? 'bg-green-600' : ''
                      }
                    >
                      {env.status === 'completed' && <CheckCircle2 className="h-4 w-4 mr-1" />}
                      {env.status}
                    </Badge>
                  </div>

                  {env.status === 'sent' || env.status === 'delivered' ? (
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                      <Signature className="h-4 w-4" />
                      Open in DocuSign
                    </Button>
                  ) : env.status === 'completed' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">All parties have signed</span>
                    </div>
                  ) : null}
                </div>
              ))}

              {!envelopes || envelopes.length === 0 && (
                <p className="text-gray-600">No documents awaiting signature</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="info">Loan Info</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Required Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'Closing Disclosure', status: 'signed', date: '2026-01-15' },
                  { name: 'Promissory Note', status: 'signed', date: '2026-01-15' },
                  { name: 'Truth in Lending', status: 'pending', date: null },
                  { name: 'Deed of Trust', status: 'pending', date: null }
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        {doc.date && (
                          <p className="text-xs text-gray-600">
                            Signed: {new Date(doc.date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={doc.status === 'signed' ? 'default' : 'secondary'}
                      className={doc.status === 'signed' ? 'bg-green-600' : ''}
                    >
                      {doc.status === 'signed' ? (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      ) : (
                        <Clock className="h-4 w-4 mr-1" />
                      )}
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Loan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {deal && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Loan Product</p>
                        <p className="font-medium">{deal.loan_product}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Loan Purpose</p>
                        <p className="font-medium">{deal.loan_purpose}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Loan Amount</p>
                        <p className="font-medium">
                          ${deal.loan_amount?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <Badge>{deal.status}</Badge>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Important Notice */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Important</p>
                <p className="text-sm text-blue-800 mt-1">
                  By signing these documents, you agree to the terms and conditions of the loan. Please review carefully before signing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}