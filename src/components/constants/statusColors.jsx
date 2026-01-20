/**
 * Standardized Status Colors
 * Use these constants across all pages for consistent status badges
 */

export const DEAL_STATUS_COLORS = {
  // Pipeline stages
  lead: 'bg-gray-100 text-gray-700',
  inquiry: 'bg-gray-100 text-gray-700',
  application: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  underwriting: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  conditional_approval: 'bg-indigo-100 text-indigo-700',
  clear_to_close: 'bg-emerald-100 text-emerald-700',
  closing: 'bg-teal-100 text-teal-700',
  funded: 'bg-green-100 text-green-700',
  post_closing: 'bg-slate-100 text-slate-700',
  
  // Negative outcomes
  denied: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
  lost: 'bg-red-100 text-red-600',
  
  // Generic statuses
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-100 text-yellow-700',
  on_hold: 'bg-orange-100 text-orange-700',
  draft: 'bg-gray-100 text-gray-600',
  closed: 'bg-slate-100 text-slate-700',
};

export const DOCUMENT_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  requested: 'bg-blue-100 text-blue-700',
  received: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

export const CONDITION_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  requested: 'bg-blue-100 text-blue-700',
  received: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  fulfilled: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  waived: 'bg-slate-100 text-slate-600',
};

export const LEAD_STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-500',
  converted: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-600',
};

export const TASK_STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
  urgent: 'bg-red-100 text-red-700',
};

// Helper functions
export function getDealStatusColor(status) {
  return DEAL_STATUS_COLORS[status] || DEAL_STATUS_COLORS.lead;
}

export function getDocumentStatusColor(status) {
  return DOCUMENT_STATUS_COLORS[status] || DOCUMENT_STATUS_COLORS.pending;
}

export function getConditionStatusColor(status) {
  return CONDITION_STATUS_COLORS[status] || CONDITION_STATUS_COLORS.pending;
}

export function getLeadStatusColor(status) {
  return LEAD_STATUS_COLORS[status] || LEAD_STATUS_COLORS.new;
}

export function getTaskStatusColor(status) {
  return TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS.pending;
}

export function getPriorityColor(priority) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
}

export default {
  DEAL_STATUS_COLORS,
  DOCUMENT_STATUS_COLORS,
  CONDITION_STATUS_COLORS,
  LEAD_STATUS_COLORS,
  TASK_STATUS_COLORS,
  PRIORITY_COLORS,
  getDealStatusColor,
  getDocumentStatusColor,
  getConditionStatusColor,
  getLeadStatusColor,
  getTaskStatusColor,
  getPriorityColor,
};