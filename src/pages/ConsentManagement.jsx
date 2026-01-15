import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Plus, Search, Filter } from 'lucide-react';

export default function ConsentManagement() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const queryClient = useQueryClient();

  const { data: emailConsents } = useQuery({
    queryKey: ['emailConsents', searchEmail],
    queryFn: () => base44.entities.ConsentRecord.filter({
      consent_type: 'email',
      ...(searchEmail && { contact_email: searchEmail })
    })
  });

  const { data: smsConsents } = useQuery({
    queryKey: ['smsConsents', searchPhone],
    queryFn: () => base44.entities.ConsentRecord.filter({
      consent_type: 'sms',
      ...(searchPhone && { contact_phone: searchPhone })
    })
  });

  const { data: emailOptOuts } = useQuery({
    queryKey: ['emailOptOuts'],
    queryFn: () => base44.entities.EmailOptOut.filter({ status: 'opted_out' })
  });

  const { data: smsOptOuts } = useQuery({
    queryKey: ['smsOptOuts'],
    queryFn: () => base44.entities.SMSOptOut.filter({ status: 'opted_out' })
  });

  const recordConsentMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('recordConsent', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailConsents'] });
      queryClient.invalidateQueries({ queryKey: ['smsConsents'] });
    }
  });

  const updateConsentMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ConsentRecord.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailConsents'] });
      queryClient.invalidateQueries({ queryKey: ['smsConsents'] });
    }
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Consent Management</h1>
        <p className="text-gray-600 mt-2">Email & SMS opt-in/opt-out tracking & compliance</p>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email Consent</TabsTrigger>
          <TabsTrigger value="sms">SMS Consent</TabsTrigger>
        </TabsList>

        {/* Email Consent */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Opt-Out Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" gap="2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>

              <div className="space-y-2">
                {emailOptOuts?.map(record => (
                  <div key={record.id} className="p-3 border rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {record.email}
                      </p>
                      <p className="text-xs text-gray-600">
                        Opted out: {new Date(record.opted_out_at).toLocaleDateString()}
                      </p>
                      {record.reason && (
                        <p className="text-xs text-gray-600">Reason: {record.reason}</p>
                      )}
                    </div>
                    <Badge variant="destructive">Opted Out</Badge>
                  </div>
                )) || <p className="text-gray-600">No email opt-outs</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Consents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {emailConsents?.map(consent => (
                <div key={consent.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{consent.contact_email}</p>
                    <p className="text-xs text-gray-600">Source: {consent.source}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={consent.status === 'opt_in' ? 'default' : 'destructive'}>
                      {consent.status === 'opt_in' ? 'Opted In' : 'Opted Out'}
                    </Badge>
                    {consent.status === 'opt_in' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateConsentMutation.mutate({ id: consent.id, status: 'opt_out' })}
                      >
                        Opt Out
                      </Button>
                    )}
                  </div>
                </div>
              )) || <p className="text-gray-600">No consent records</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Consent */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Opt-Out Records (TCPA Compliance)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search phone..."
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" gap="2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>

              <div className="space-y-2">
                {smsOptOuts?.map(record => (
                  <div key={record.id} className="p-3 border rounded flex justify-between items-center bg-red-50">
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {record.phone_number}
                      </p>
                      <p className="text-xs text-gray-600">
                        Opted out: {new Date(record.opted_out_at).toLocaleDateString()}
                      </p>
                      {record.reason && (
                        <p className="text-xs text-gray-600">Reason: {record.reason}</p>
                      )}
                    </div>
                    <Badge variant="destructive">DO NOT SEND</Badge>
                  </div>
                )) || <p className="text-gray-600">No SMS opt-outs</p>}
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>TCPA Compliance:</strong> Check this list before sending any SMS. Sending to opted-out numbers violates TCPA.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS Consents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {smsConsents?.map(consent => (
                <div key={consent.id} className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{consent.contact_phone}</p>
                    <p className="text-xs text-gray-600">Source: {consent.source}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={consent.status === 'opt_in' ? 'default' : 'destructive'}>
                      {consent.status === 'opt_in' ? 'Opted In' : 'Opted Out'}
                    </Badge>
                    {consent.status === 'opt_in' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateConsentMutation.mutate({ id: consent.id, status: 'opt_out' })}
                      >
                        Opt Out
                      </Button>
                    )}
                  </div>
                </div>
              )) || <p className="text-gray-600">No consent records</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}