/**
 * Standardized Page Header Component
 * Use this for consistent page headers across all pages
 */
import React from 'react';
import { cn } from "@/lib/utils";

export function PageHeader({ 
  title, 
  subtitle, 
  actions, 
  className,
  breadcrumbs 
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs && (
        <nav className="mb-2 text-sm text-gray-500">
          {breadcrumbs}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;