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
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Circle,
  ArrowRight,
  FileCheck,
  Building2
} from 'lucide-react';

// Deal/Loan stage badges
const DEAL_STAGE_CONFIG = {
  inquiry: { label: 'Inquiry', color: 'bg-gray-100 text-gray-700', icon: Circle },
  application: { label: 'Application', color: 'bg-blue-100 text-blue-700', icon: FileCheck },
  processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  underwriting: { label: 'Underwriting', color: 'bg-purple-100 text-purple-700', icon: Building2 },
  approved: { label: 'Approved', color: 'bg-orange-100 text-orange-700', icon: CheckCircle },
  closing: { label: 'Closing', color: 'bg-teal-100 text-teal-700', icon: ArrowRight },
  funded: { label: 'Funded', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  denied: { label: 'Denied', color: 'bg-red-100 text-red-700', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

export function DealStageBadge({ stage, showIcon = false, size = 'default' }) {
  const config = DEAL_STAGE_CONFIG[stage] || { 
    label: stage?.replace(/_/g, ' ') || 'Unknown', 
    color: 'bg-gray-100 text-gray-700',
    icon: Circle 
  };
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.color} ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

// Task status badges
const TASK_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: ArrowRight },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: XCircle },
};

export function TaskStatusBadge({ status, showIcon = false }) {
  const config = TASK_STATUS_CONFIG[status] || { 
    label: status?.replace(/_/g, ' ') || 'Unknown', 
    color: 'bg-gray-100 text-gray-700',
    icon: Circle 
  };
  const Icon = config.icon;
  
  return (
    <Badge className={config.color}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

// Priority badges
const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

export function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || { 
    label: priority || 'Normal', 
    color: 'bg-gray-100 text-gray-700' 
  };
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
}

// Lead status badges
const LEAD_STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  qualified: { label: 'Qualified', color: 'bg-green-100 text-green-700' },
  unqualified: { label: 'Unqualified', color: 'bg-gray-100 text-gray-600' },
  converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
};

export function LeadStatusBadge({ status }) {
  const config = LEAD_STATUS_CONFIG[status] || { 
    label: status?.replace(/_/g, ' ') || 'Unknown', 
    color: 'bg-gray-100 text-gray-700' 
  };
  
  return (
    <Badge className={config.color}>
      {config.label}
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
// Document status badges
const DOC_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  uploaded: { label: 'Uploaded', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  reviewed: { label: 'Reviewed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
};

export function DocumentStatusBadge({ status, showIcon = false }) {
  const config = DOC_STATUS_CONFIG[status] || { 
    label: status?.replace(/_/g, ' ') || 'Unknown', 
    color: 'bg-gray-100 text-gray-700',
    icon: Circle 
  };
  const Icon = config.icon;
  
  return (
    <Badge className={config.color}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

// Condition status badges
const CONDITION_STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-yellow-100 text-yellow-700' },
  in_review: { label: 'In Review', color: 'bg-blue-100 text-blue-700' },
  cleared: { label: 'Cleared', color: 'bg-green-100 text-green-700' },
  waived: { label: 'Waived', color: 'bg-purple-100 text-purple-700' },
};

export function ConditionStatusBadge({ status }) {
  const config = CONDITION_STATUS_CONFIG[status] || { 
    label: status?.replace(/_/g, ' ') || 'Unknown', 
    color: 'bg-gray-100 text-gray-700' 
  };
  
  return (
    <Badge className={config.color}>
      {config.label}
    </Badge>
  );
}

// Generic status badge with color
export function StatusBadge({ status, color }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  
  return (
    <Badge className={colorClasses[color] || colorClasses.gray}>
      {status}
    </Badge>
  );
}
