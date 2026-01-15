import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function EnvelopeStatusCard({ envelope, signers }) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'sent':
      case 'delivered':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-slate-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-blue-100 text-blue-800',
      signed: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
      voided: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex items-start gap-3">
          {getStatusIcon(envelope.status)}
          <div>
            <CardTitle className="text-base">{envelope.envelope_name}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              Sent: {envelope.sent_at ? new Date(envelope.sent_at).toLocaleDateString() : 'Pending'}
            </p>
          </div>
        </div>
        <Badge className={getStatusBadge(envelope.status)}>
          {envelope.status}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Signers:</p>
          <div className="space-y-1">
            {signers?.map(signer => (
              <div key={signer.id} className="text-sm flex justify-between">
                <span>{signer.name}</span>
                <Badge variant={signer.status === 'signed' ? 'default' : 'outline'}>
                  {signer.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {envelope.status !== 'completed' && envelope.status !== 'declined' && (
            <>
              <Button size="sm" variant="outline">Resend</Button>
              <Button size="sm" variant="outline">Void</Button>
            </>
          )}
          {envelope.status === 'completed' && (
            <Button size="sm" variant="outline">Download Signed Docs</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}