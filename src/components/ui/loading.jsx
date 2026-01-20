/**
 * Standardized Loading Components
 * Use these instead of inline spinners for consistency
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

/**
 * Loading spinner with consistent styling
 */
export function LoadingSpinner({ size = 'md', className, color = 'blue' }) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-500',
    purple: 'text-purple-600',
    green: 'text-green-600',
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size] || sizeClasses.md,
        colorClasses[color] || colorClasses.blue,
        className
      )} 
    />
  );
}

/**
 * Full-page loading state
 */
export function LoadingPage({ message = 'Loading...', className }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[400px] p-8",
      className
    )}>
      <LoadingSpinner size="lg" />
      <p className="text-gray-500 mt-4">{message}</p>
    </div>
  );
}

/**
 * Inline loading indicator (for buttons, small areas)
 */
export function LoadingInline({ className }) {
  return (
    <LoadingSpinner size="sm" className={className} />
  );
}

/**
 * Card/section loading skeleton
 */
export function LoadingSkeleton({ className, rows = 3 }) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-gray-200 rounded"
          style={{ width: `${100 - (i * 15)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Table row skeleton for loading states
 */
export function TableRowSkeleton({ cols = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Card loading placeholder
 */
export function LoadingCard({ className }) {
  return (
    <div className={cn(
      "rounded-lg border border-gray-200 p-6 animate-pulse",
      className
    )}>
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export default LoadingSpinner;