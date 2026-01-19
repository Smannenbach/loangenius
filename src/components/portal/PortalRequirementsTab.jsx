import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, CheckCircle2, Clock, AlertCircle, Upload, ChevronRight } from 'lucide-react';
import PortalDocumentUploadEnhanced from './PortalDocumentUploadEnhanced';

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending', badge: 'bg-amber-100 text-amber-800', canUpload: true },
  requested: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Requested', badge: 'bg-blue-100 text-blue-800', canUpload: true },
  uploaded: { icon: Upload, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Uploaded', badge: 'bg-purple-100 text-purple-800', canUpload: false },
  under_review: { icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Under Review', badge: 'bg-purple-100 text-purple-800', canUpload: false },
  approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved', badge: 'bg-green-100 text-green-800', canUpload: false },
  rejected: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected', badge: 'bg-red-100 text-red-800', canUpload: true },
};

export default function PortalRequirementsTab({ requirements = {}, sessionId }) {
  const [uploadModal, setUploadModal] = useState(null);
  if (!requirements || Object.keys(requirements).length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-slate-600">
          <p>No document requirements at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(requirements).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold text-slate-900 mb-3 capitalize flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            {category}
          </h3>
          <div className="space-y-3">
            {items.map((req) => {
              const status = statusConfig[req.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Card key={req.id} className={`border transition-all hover:shadow-md ${status.bg.replace('bg-', 'border-').slice(0, -3)}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${status.bg}`}>
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{req.display_name || req.document_type}</p>
                            {req.instructions && (
                              <p className="text-sm text-slate-600 mt-1">{req.instructions}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={status.badge}>{status.label}</Badge>
                            {status.canUpload && (
                              <Button
                                size="sm"
                                onClick={() => setUploadModal(req)}
                                className="bg-blue-600 hover:bg-blue-700 gap-1"
                              >
                                <Upload className="h-3 w-3" />
                                Upload
                              </Button>
                            )}
                          </div>
                        </div>
                        {req.due_date && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                            <Clock className="h-3 w-3" />
                            Due: {new Date(req.due_date).toLocaleDateString()}
                          </p>
                        )}
                        {req.reviewer_notes && (
                          <div className="mt-3 p-2 bg-white rounded border border-slate-200">
                            <p className="text-xs font-medium text-slate-700 mb-1">Feedback:</p>
                            <p className="text-xs text-slate-600">{req.reviewer_notes}</p>
                          </div>
                        )}
                        {req.status === 'rejected' && (
                          <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
                            <p className="text-xs font-medium text-red-700 mb-1">Please re-upload:</p>
                            <p className="text-xs text-red-600">{req.rejection_reason || 'Document was not accepted. Please upload a new file.'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Upload Modal */}
      <Dialog open={!!uploadModal} onOpenChange={() => setUploadModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload: {uploadModal?.display_name || uploadModal?.document_type}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {uploadModal?.instructions && (
              <p className="text-sm text-slate-600 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                💡 {uploadModal.instructions}
              </p>
            )}
            <PortalDocumentUploadEnhanced
              sessionId={sessionId}
              requirementId={uploadModal?.id}
              requirementName={uploadModal?.display_name || uploadModal?.document_type}
              onUploadComplete={() => setUploadModal(null)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}