import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AccessDenied from './AccessDenied';
import { Loader2 } from 'lucide-react';

/**
 * Wrapper component that blocks non-admin users from accessing admin pages
 */
export default function AdminRoute({ children }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <AccessDenied message="Please log in to access this page." />;
  }

  if (user.role !== 'admin') {
    return <AccessDenied message="Only administrators can access this page." />;
  }

  return children;
}