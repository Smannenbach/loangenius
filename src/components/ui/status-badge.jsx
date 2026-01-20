import React from 'react';
import { Badge } from '@/components/ui/badge';
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