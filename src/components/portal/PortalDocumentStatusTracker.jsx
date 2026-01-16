import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, Clock, Upload, Eye, XCircle, 
  AlertTriangle, FileText, Loader2 
} from 'lucide-react';

export default function PortalDocumentStatusTracker({ requirements = [] }) {
  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'Needed',
        description: 'Please upload this document'
      },
      uploaded: {
        icon: Upload,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        label: 'Uploaded',
        description: 'Under review by our team'
      },
      under_review: {
        icon: Eye,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        label: 'In Review',
        description: 'Being reviewed'
      },
      accepted: {
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Accepted',
        description: 'Document approved'
      },
      rejected: {
        icon: XCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Rejected',
        description: 'Please upload a new version'
      },
      waived: {
        icon: CheckCircle2,
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        label: 'Waived',
        description: 'Not required for your loan'
      }
    };
    return configs[status] || configs.pending;
  };

  const totalRequired = requirements.filter(r => r.is_required).length;
  const completedRequired = requirements.filter(r => 
    r.is_required && ['accepted', 'waived'].includes(r.status)
  ).length;
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;

  const statusGroups = {
    needed: requirements.filter(r => r.status === 'pending' && r.is_required),
    uploaded: requirements.filter(r => ['uploaded', 'under_review'].includes(r.status)),
    completed: requirements.filter(r => ['accepted', 'waived'].includes(r.status)),
    rejected: requirements.filter(r => r.status === 'rejected')
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">Document Checklist</h3>
                <p className="text-sm text-gray-600">
                  {completedRequired} of {totalRequired} required documents completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{progress}%</div>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
            <Progress value={progress} className="h-3 bg-blue-100" />
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Needed */}
          {statusGroups.needed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-orange-500" />
                <h4 className="font-semibold text-gray-900">
                  Action Required ({statusGroups.needed.length})
                </h4>
              </div>
              <div className="space-y-2 pl-7">
                {statusGroups.needed.map((req) => {
                  const config = getStatusConfig(req.status);
                  return (
                    <div key={req.id} className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <p className="font-medium text-sm">{req.requirement_name}</p>
                      </div>
                      {req.instructions && (
                        <p className="text-xs text-gray-600 mt-1 pl-6">{req.instructions}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* In Review */}
          {statusGroups.uploaded.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <h4 className="font-semibold text-gray-900">
                  Under Review ({statusGroups.uploaded.length})
                </h4>
              </div>
              <div className="space-y-2 pl-7">
                {statusGroups.uploaded.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <p className="font-medium text-sm">{req.requirement_name}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">In Review</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected */}
          {statusGroups.rejected.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <h4 className="font-semibold text-gray-900">
                  Needs Reupload ({statusGroups.rejected.length})
                </h4>
              </div>
              <div className="space-y-2 pl-7">
                {statusGroups.rejected.map((req) => (
                  <div key={req.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="font-medium text-sm">{req.requirement_name}</p>
                    </div>
                    {req.rejection_reason && (
                      <p className="text-xs text-red-700 pl-6 mt-1">
                        <strong>Reason:</strong> {req.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {statusGroups.completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <h4 className="font-semibold text-gray-900">
                  Completed ({statusGroups.completed.length})
                </h4>
              </div>
              <div className="space-y-2 pl-7">
                {statusGroups.completed.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{req.requirement_name}</span>
                  </div>
                ))}
                {statusGroups.completed.length > 3 && (
                  <p className="text-xs text-gray-500 pl-6">
                    +{statusGroups.completed.length - 3} more completed
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}