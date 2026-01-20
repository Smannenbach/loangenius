import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Skeleton loading states for consistent UX across the app
 */

export function SkeletonPulse({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonPulse
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ hasHeader = true, lines = 3 }) {
  return (
    <Card>
      {hasHeader && (
        <CardHeader className="pb-2">
          <SkeletonPulse className="h-6 w-1/3" />
        </CardHeader>
      )}
      <CardContent>
        <SkeletonText lines={lines} />
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 border-b p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonPulse key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="border-b last:border-0 p-4 flex gap-4">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonPulse key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDealCard() {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-5 w-2/3" />
            <SkeletonPulse className="h-4 w-1/2" />
          </div>
          <SkeletonPulse className="h-6 w-20 rounded-full" />
        </div>
        <div className="mt-4 flex gap-4">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <SkeletonPulse className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonPulse className="h-4 w-1/3" />
            <SkeletonPulse className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <SkeletonPulse className="h-4 w-1/2 mb-2" />
            <SkeletonPulse className="h-8 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <svg
      className={`animate-spin text-blue-600 ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <LoadingSpinner size="xl" />
      <p className="text-gray-500 animate-pulse">{message}</p>
    </div>
  );
}
