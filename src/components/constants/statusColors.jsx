/**
 * Shared Status Color Constants
 * Standardizes status badge colors across all components
 */

export const STATUS_COLORS = {
  // Deal/Loan Stages
  inquiry: 'bg-gray-100 text-gray-700',
  lead: 'bg-gray-100 text-gray-700',
  application: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  underwriting: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  closing: 'bg-teal-100 text-teal-700',
  funded: 'bg-emerald-100 text-emerald-700',
  post_closing: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-teal-100 text-teal-700',
  denied: 'bg-red-100 text-red-700',
  withdrawn: 'bg-slate-100 text-slate-700',
  
  // Lead Status
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-orange-100 text-orange-700',
  converted: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  
  // Document Status
  pending: 'bg-yellow-100 text-yellow-700',
  received: 'bg-blue-100 text-blue-700',
  under_review: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
  
  // Task Status
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  
  // Generic
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  draft: 'bg-gray-100 text-gray-700',
  
  // Default fallback
  default: 'bg-gray-100 text-gray-700',
};

/**
 * Get status color class for a given status
 * @param {string} status - The status string
 * @returns {string} - Tailwind CSS classes for the badge
 */
export function getStatusColor(status) {
  if (!status) return STATUS_COLORS.default;
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_COLORS[normalized] || STATUS_COLORS.default;
}

/**
 * Priority colors
 */
export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
  critical: 'bg-red-200 text-red-800',
};

export function getPriorityColor(priority) {
  if (!priority) return PRIORITY_COLORS.medium;
  return PRIORITY_COLORS[priority.toLowerCase()] || PRIORITY_COLORS.medium;
}

/**
 * Loan product colors
 */
export const LOAN_PRODUCT_COLORS = {
  dscr: 'bg-blue-100 text-blue-700',
  conventional: 'bg-green-100 text-green-700',
  fha: 'bg-purple-100 text-purple-700',
  va: 'bg-indigo-100 text-indigo-700',
  bridge: 'bg-orange-100 text-orange-700',
  hard_money: 'bg-red-100 text-red-700',
  commercial: 'bg-teal-100 text-teal-700',
};

export function getLoanProductColor(product) {
  if (!product) return 'bg-gray-100 text-gray-700';
  const normalized = product.toLowerCase().replace(/[^a-z]/g, '_');
  return LOAN_PRODUCT_COLORS[normalized] || 'bg-gray-100 text-gray-700';
}