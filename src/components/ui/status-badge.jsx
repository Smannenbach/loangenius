import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle, Clock, AlertCircle, XCircle, Loader2,
  FileText, Send, Eye, Download, Upload, Edit, Trash2
} from 'lucide-react';

/**
 * Status badge with consistent styling across the app
 */

const statusConfig = {
  // General statuses
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: XCircle,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Loader2,
    iconClassName: 'animate-spin',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  success: {
    label: 'Success',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },

  // Deal stages
  lead: {
    label: 'Lead',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  application: {
    label: 'Application',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  underwriting: {
    label: 'Underwriting',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  conditional_approval: {
    label: 'Conditional',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  clear_to_close: {
    label: 'Clear to Close',
    className: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  },
  closing: {
    label: 'Closing',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  funded: {
    label: 'Funded',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-600 border-red-200',
    icon: XCircle,
  },
  denied: {
    label: 'Denied',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },

  // Document statuses
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: FileText,
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Send,
  },
  viewed: {
    label: 'Viewed',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Eye,
  },
  signed: {
    label: 'Signed',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  uploaded: {
    label: 'Uploaded',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Upload,
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: Clock,
  },

  // Task statuses
  todo: {
    label: 'To Do',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Loader2,
    iconClassName: 'animate-spin',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },

  // Verification statuses
  verified: {
    label: 'Verified',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  unverified: {
    label: 'Unverified',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertCircle,
  },

  // Priority
  low: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-600 border-blue-200',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-600 border-orange-200',
  },
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-600 border-red-200',
    icon: AlertCircle,
  },
};

export function StatusBadge({
  status,
  label,
  showIcon = true,
  size = 'default',
  className = '',
}) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const displayLabel = label || config.label;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <Badge
      variant="outline"
      className={`
        ${config.className}
        ${sizeClasses[size]}
        font-medium gap-1.5 border
        ${className}
      `}
    >
      {showIcon && Icon && (
        <Icon className={`h-3 w-3 ${config.iconClassName || ''}`} />
      )}
      {displayLabel}
    </Badge>
  );
}

// Convenience components for common statuses
export function DealStageBadge({ stage, className }) {
  return <StatusBadge status={stage} showIcon={false} className={className} />;
}

export function TaskStatusBadge({ status, className }) {
  return <StatusBadge status={status} className={className} />;
}

export function DocumentStatusBadge({ status, className }) {
  return <StatusBadge status={status} className={className} />;
}

export function PriorityBadge({ priority, className }) {
  return <StatusBadge status={priority} showIcon={priority === 'urgent'} className={className} />;
}

export function VerificationBadge({ verified, className }) {
  return <StatusBadge status={verified ? 'verified' : 'unverified'} className={className} />;
}
