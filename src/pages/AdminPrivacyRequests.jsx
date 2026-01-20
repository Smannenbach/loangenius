import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useOrgScopedQuery, useOrgId } from '@/components/useOrgId';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPrivacyRequests() {
  const { orgId, isReady } = useOrgId();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter, setFilter] = useState('all');

  const { data: requests = [], isLoading } = useOrgScopedQuery(
    'PrivacyRequest',
    {},
    '-received_at'
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.PrivacyRequest.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['PrivacyRequest', orgId] });
      toast.success('Request updated');
      setShowDetail(false);
    },
  });

  const handleVerify = (request, status) => {
    updateMutation.mutate({
      id: request.id,
      data: {
        verification_status: status,
        verification_completed_at: status === 'verified' ? new Date().toISOString() : null,
        verification_method: 'manual_review',
      },
    });
  };

  const handleUpdateStatus = (request, status) => {
    updateMutation.mutate({
      id: request.id,
      data: {
        status: status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      },
    });
  };

  const statusBadge = (status) => {
    const styles = {
      received: 'bg-blue-100 text-blue-800',
      in_review: 'bg-yellow-100 text-yellow-800',
      fulfilling: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status] || ''}>{status.replace('_', ' ')}</Badge>;
  };

  const filteredRequests = requests.filter(r => 
    filter === 'all' || r.status === filter
  );

  const getDaysRemaining = (dueAt) => {
    const due = new Date(dueAt);
    const now = new Date();
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (isLoading || !isReady) {
    return <div className="p-6">Loading privacy requests...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Requests</h1>
        <p className="text-gray-600">Manage GDPR, CCPA, and CPRA data subject requests</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'received', 'in_review', 'fulfilling', 'completed', 'rejected'].map(status => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            onClick={() => setFilter(status)}
            size="sm"
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredRequests.map(request => {
          const daysRemaining = getDaysRemaining(request.due_at);
          const isOverdue = daysRemaining < 0;
          const isUrgent = daysRemaining <= 7 && daysRemaining >= 0;

          return (
            <Card key={request.id} className={isOverdue ? 'border-red-500' : isUrgent ? 'border-yellow-500' : ''}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{request.request_id}</CardTitle>
                    {statusBadge(request.status)}
                    <Badge variant="outline">{request.jurisdiction}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Type:</strong> {request.request_type}</p>
                    <p><strong>Requester:</strong> {request.requester_name} ({request.requester_email})</p>
                    <p><strong>Received:</strong> {new Date(request.received_at).toLocaleDateString()}</p>
                    <p className={isOverdue ? 'text-red-600 font-semibold' : isUrgent ? 'text-yellow-600 font-semibold' : ''}>
                      <strong>Due:</strong> {new Date(request.due_at).toLocaleDateString()}
                      {isOverdue && ' (OVERDUE)'}
                      {isUrgent && ` (${daysRemaining} days left)`}
                    </p>
                    <p><strong>Verification:</strong> {request.verification_status || 'not_started'}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRequest(request);
                    setShowDetail(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Request: {selectedRequest?.request_id}</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Request Type</Label>
                  <p className="text-sm">{selectedRequest.request_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Jurisdiction</Label>
                  <p className="text-sm">{selectedRequest.jurisdiction}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Requester</Label>
                  <p className="text-sm">{selectedRequest.requester_name}</p>
                  <p className="text-xs text-gray-500">{selectedRequest.requester_email}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  {statusBadge(selectedRequest.status)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <p className="text-sm mt-1">{selectedRequest.notes || 'No additional details'}</p>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-2 block">Identity Verification</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(selectedRequest, 'verified')}
                    disabled={selectedRequest.verification_status === 'verified'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(selectedRequest, 'denied')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deny
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-2 block">Update Status</Label>
                <div className="flex gap-2 flex-wrap">
                  {['in_review', 'fulfilling', 'completed', 'rejected'].map(status => (
                    <Button
                      key={status}
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedRequest, status)}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Label = ({ children, className = '' }) => (
  <label className={`block text-sm font-medium text-gray-700 ${className}`}>{children}</label>
);