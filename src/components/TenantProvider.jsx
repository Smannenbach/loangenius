import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const { data: context, isLoading, error } = useQuery({
    queryKey: ['tenantContext'],
    queryFn: async () => {
      const response = await base44.functions.invoke('resolveTenantContext', {});
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Apply branding CSS variables when context loads
  useEffect(() => {
    if (context?.ok && context.branding) {
      const root = document.documentElement;
      const branding = context.branding;
      
      if (branding.primary_color) root.style.setProperty('--brand-primary', branding.primary_color);
      if (branding.secondary_color) root.style.setProperty('--brand-secondary', branding.secondary_color);
      if (branding.accent_color) root.style.setProperty('--brand-accent', branding.accent_color);
      if (branding.background_color) root.style.setProperty('--brand-bg', branding.background_color);
      if (branding.text_color) root.style.setProperty('--brand-text', branding.text_color);
      if (branding.border_radius) root.style.setProperty('--brand-radius', branding.border_radius);
      if (branding.font_family) root.style.setProperty('--brand-font', branding.font_family);

      // Set favicon if provided
      if (branding.favicon_url) {
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = branding.favicon_url;
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      // Load custom font if provided
      if (branding.font_url) {
        const linkFont = document.createElement('link');
        linkFont.rel = 'stylesheet';
        linkFont.href = branding.font_url;
        document.head.appendChild(linkFont);
      }

      // Apply custom CSS if provided
      if (branding.custom_css) {
        const style = document.createElement('style');
        style.textContent = branding.custom_css;
        document.head.appendChild(style);
      }

      // Update document title
      if (branding.app_name) {
        document.title = branding.app_name;
      }
    }
  }, [context]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !context?.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">
            {context?.error || error?.message || 'Unable to load tenant context'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={context}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}