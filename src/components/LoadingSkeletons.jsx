import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card className="bg-white border-0 shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-32 mt-3 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-20 mt-2 animate-pulse" />
          </div>
          <div className="h-12 w-12 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableRowSkeleton({ cols = 8 }) {
  return (
    <tr>
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="px-8 py-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

export function ListItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded bg-gray-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
      </CardHeader>
      <CardContent className="h-64 flex items-center justify-center">
        <div className="w-full space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}