/**
 * Standardized Empty State Component
 * Use this for consistent empty states across all pages
 */
import React from 'react';
import { cn } from "@/lib/utils";
import { FileText } from 'lucide-react';

export function EmptyState({ 
  icon: Icon = FileText, 
  title = 'No data found', 
  description, 
  action,
  className 
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      <Icon className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;