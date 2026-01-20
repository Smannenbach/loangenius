import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileSignature, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Eye,
  RefreshCw,
  Loader2,
  User,
  Calendar
} from 'lucide-react';

const STATUS_CONFIG = {
  created: { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Created' },
  sent: { icon: Mail, color: 'bg-blue-100 text-blue-700', label: 'Sent' },
  delivered: { icon: Eye, color: 'bg-indigo-100 text-indigo-700', label: 'Delivered' },
  signed: { icon: FileSignature, color: 'bg-purple-100 text-purple-700', label: 'Signed' },
  completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700', label: 'Completed' },
  declined: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Declined' },
  voided: { icon: XCircle, color: 'bg-gray-100 text-gray-500', label: 'Voided' },
  expired: { icon: Clock, color: 'bg-orange-100 text-orange-700', label: 'Expired' },
};

export default function EnvelopeStatusCard({ dealId }) {
  const { data: envelopes = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['envelopes', dealId],
    queryFn: () => base44.entities.DocuSignEnvelope.filter({ deal_id: dealId }),
    enabled: !!dealId,
  });

  const { data: signers = [] } = useQuery({
    queryKey: ['envelope-signers', dealId],
    queryFn: async () => {
      if (envelopes.length === 0) return [];
      const allSigners = await Promise.all(
        envelopes.map(env => 
          base44.entities.DocuSignEnvelopeSigner.filter({ envelope_id: env.id })
        )
      );
      return allSigners.flat();
    },
    enabled: envelopes.length > 0,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (envelopes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <FileSignature className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-2">No signature requests yet</p>
          <p className="text-sm text-gray-400">Use "Send for Signature" to create one</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-blue-600" />
          E-Signature Status
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {envelopes.map((envelope) => {
          const config = STATUS_CONFIG[envelope.status] || STATUS_CONFIG.created;
          const StatusIcon = config.icon;
          const envelopeSigners = signers.filter(s => s.envelope_id === envelope.id);

          return (
            <div key={envelope.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {envelope.envelope_name || envelope.document_type || 'Signature Request'}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Created {new Date(envelope.created_date).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={config.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              {/* Audit Trail / Signer Status */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-gray-600 uppercase">Signers</p>
                {envelopeSigners.length === 0 ? (
                  <p className="text-sm text-gray-400">No signer information available</p>
                ) : (
                  envelopeSigners.map((signer, idx) => {
                    const signerConfig = STATUS_CONFIG[signer.status] || STATUS_CONFIG.sent;
                    const SignerIcon = signerConfig.icon;
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{signer.name || signer.email}</span>
                          <span className="text-xs text-gray-400">({signer.role || 'Signer'})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {signer.signed_at && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(signer.signed_at).toLocaleDateString()}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <SignerIcon className="h-3 w-3 mr-1" />
                            {signer.status || 'sent'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Timeline Events */}
              <div className="space-y-1 pt-2 border-t">
                <p className="text-xs font-medium text-gray-600 uppercase">Timeline</p>
                <div className="space-y-1 text-xs text-gray-500">
                  {envelope.sent_at && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      Sent: {new Date(envelope.sent_at).toLocaleString()}
                    </div>
                  )}
                  {envelope.delivered_at && (
                    <div className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Delivered: {new Date(envelope.delivered_at).toLocaleString()}
                    </div>
                  )}
                  {envelope.signed_at && (
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-3 w-3" />
                      Signed: {new Date(envelope.signed_at).toLocaleString()}
                    </div>
                  )}
                  {envelope.completed_at && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed: {new Date(envelope.completed_at).toLocaleString()}
                    </div>
                  )}
                  {envelope.declined_at && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-3 w-3" />
                      Declined: {new Date(envelope.declined_at).toLocaleString()}
                      {envelope.decline_reason && ` - ${envelope.decline_reason}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}