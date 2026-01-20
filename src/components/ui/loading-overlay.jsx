import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Full-screen loading overlay for page transitions
 */
export function FullPageLoader({ message = 'Loading...', className }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-blue-200" />
          <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
        <p className="text-gray-600 font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
}

/**
 * Section loading overlay (relative to parent container)
 */
export function SectionLoader({ message, className, size = 'md' }) {
  const sizes = {
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] rounded-lg',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('animate-spin text-blue-600', sizes[size])} />
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}

/**
 * Inline loading spinner for buttons or small areas
 */
export function InlineSpinner({ className, size = 16 }) {
  return (
    <Loader2
      className={cn('animate-spin', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/**
 * Progress bar for multi-step operations
 */
export function ProgressLoader({ progress, message, className }) {
  return (
    <div className={cn('w-full', className)} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{message}</span>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton text lines for content loading
 */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton avatar for profile loading
 */
export function SkeletonAvatar({ size = 'md', className }) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  return (
    <div
      className={cn('rounded-full bg-gray-200 animate-pulse', sizes[size], className)}
      aria-hidden="true"
    />
  );
}

/**
 * Loading dots animation
 */
export function LoadingDots({ className }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden="true">
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

/**
 * Button with loading state
 */
export function LoadingButton({
  children,
  isLoading,
  loadingText,
  disabled,
  className,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors',
        'bg-blue-600 text-white hover:bg-blue-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <InlineSpinner className="text-white" />
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default {
  FullPageLoader,
  SectionLoader,
  InlineSpinner,
  ProgressLoader,
  SkeletonText,
  SkeletonAvatar,
  LoadingDots,
  LoadingButton,
};
