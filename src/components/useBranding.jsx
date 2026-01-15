import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import React from 'react';

export function useBranding(orgId) {
  const { data: branding = {}, isLoading, refetch } = useQuery({
    queryKey: ['branding', orgId],
    queryFn: async () => {
      if (!orgId) return getDefaultBranding();
      const result = await base44.entities.PortalBranding.filter({ org_id: orgId });
      return result?.[0] || getDefaultBranding();
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!orgId,
  });

  React.useEffect(() => {
    if (!branding || !branding.primary_color) return;
    
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primary_color);
    root.style.setProperty('--brand-secondary', branding.secondary_color);
    root.style.setProperty('--brand-accent', branding.accent_color);
    root.style.setProperty('--brand-bg', branding.background_color);
    root.style.setProperty('--brand-text', branding.text_color);
    root.style.setProperty('--brand-font-heading', branding.font_heading);
    root.style.setProperty('--brand-font-body', branding.font_body);
    
    const radius = { rounded: '0.5rem', sharp: '0', pill: '9999px' }[branding.button_style] || '0.5rem';
    root.style.setProperty('--brand-radius', radius);

    localStorage.setItem('portalBranding', JSON.stringify(branding));
  }, [branding]);

  return { branding, isLoading, refetch };
}

export function getDefaultBranding() {
  return {
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    accent_color: '#10b981',
    background_color: '#ffffff',
    text_color: '#1f2937',
    button_style: 'rounded',
    font_heading: 'Inter',
    font_body: 'Inter',
    welcome_message: 'Welcome! Upload your documents to get started.',
  };
}

export function getCachedBranding() {
  try {
    return JSON.parse(localStorage.getItem('portalBranding')) || getDefaultBranding();
  } catch {
    return getDefaultBranding();
  }
}