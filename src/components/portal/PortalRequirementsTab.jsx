import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Clock, AlertCircle, Upload } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pending', badge: 'bg-amber-100 text-amber-800' },
  requested: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Requested', badge: 'bg-blue-100 text-blue-800' },
  uploaded: { icon: Upload, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Uploaded', badge: 'bg-purple-100 text-purple-800' },
  under_review: { icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Under Review', badge: 'bg-purple-100 text-purple-800' },
  approved: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved', badge: 'bg-green-100 text-green-800' },
  rejected: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected', badge: 'bg-red-100 text-red-800' },
};

export default function PortalRequirementsTab({ requirements = {} }) {
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
                <Card key={req.id} className={`border transition-all ${status.bg.replace('bg-', 'border-').slice(0, -3)}`}>
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
                          <Badge className={status.badge}>{status.label}</Badge>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}