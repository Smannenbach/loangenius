import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Upload, Loader2, Building2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function BrandingSettings() {
  const queryClient = useQueryClient();
  const logoInputRef = useRef(null);
  const logoDarkInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false);
  
  const [branding, setBranding] = useState({
    company_name: '',
    logo_url: '',
    logo_dark_url: '',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    nmls_id: '',
    phone: '',
    address: '',
    website: '',
    legal_disclaimer: ''
  });

  // Get current user and their org
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['userMembership', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.OrgMembership.filter({ user_id: user.email });
    },
    enabled: !!user?.email,
  });

  const orgId = memberships[0]?.org_id;

  // Fetch existing OrgSettings
  const { data: orgSettings, refetch: refetchOrgSettings } = useQuery({
    queryKey: ['orgSettings', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      try {
        const settings = await base44.entities.OrgSettings.filter({ org_id: orgId });
        return settings[0] || null;
      } catch {
        return null;
      }
    },
    enabled: !!orgId,
  });

  // Load existing branding data
  useEffect(() => {
    if (orgSettings) {
      setBranding(prev => ({
        ...prev,
        company_name: orgSettings.company_name || '',
        logo_url: orgSettings.logo_url || '',
        logo_dark_url: orgSettings.logo_dark_url || '',
        primary_color: orgSettings.primary_color || '#2563eb',
        secondary_color: orgSettings.secondary_color || '#1e40af',
        nmls_id: orgSettings.nmls_id || '',
        phone: orgSettings.phone || '',
        address: orgSettings.address || '',
        website: orgSettings.website || '',
        legal_disclaimer: prev.legal_disclaimer, // Keep local value
      }));
    }
  }, [orgSettings]);

  // Save branding to OrgSettings
  const saveBrandingMutation = useMutation({
    mutationFn: async (data) => {
      if (!orgId) throw new Error('No organization found');
      
      const settingsData = {
        org_id: orgId,
        company_name: data.company_name,
        logo_url: data.logo_url,
        logo_dark_url: data.logo_dark_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        nmls_id: data.nmls_id,
        phone: data.phone,
        address: data.address,
        website: data.website,
      };
      
      if (orgSettings?.id) {
        return await base44.entities.OrgSettings.update(orgSettings.id, settingsData);
      } else {
        return await base44.entities.OrgSettings.create(settingsData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgSettings'] });
      refetchOrgSettings();
      toast.success('Branding settings saved!');
    },
    onError: (error) => {
      toast.error('Failed to save branding: ' + error.message);
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (e, isDark = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isDark) {
      setUploadingLogoDark(true);
    } else {
      setUploadingLogo(true);
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (isDark) {
        setBranding(prev => ({ ...prev, logo_dark_url: file_url }));
      } else {
        setBranding(prev => ({ ...prev, logo_url: file_url }));
      }
      
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error('Logo upload failed: ' + err.message);
    } finally {
      if (isDark) {
        setUploadingLogoDark(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveBrandingMutation.mutate(branding);
  };

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle>Company Branding</CardTitle>
        <CardDescription>Customize how your company appears on documents and the portal</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <Label>Company Name</Label>
            <Input 
              value={branding.company_name}
              onChange={(e) => setBranding({...branding, company_name: e.target.value})}
              placeholder="Loan Daddy, LLC"
            />
          </div>

          {/* Logo Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Logo */}
            <div className="space-y-2">
              <Label>Logo (Light Background)</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-32 border border-gray-200 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                  {branding.logo_url ? (
                    <img src={branding.logo_url} alt="Company Logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <Building2 className="h-8 w-8 text-gray-400" />
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, false)}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogo ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Dark Logo */}
            <div className="space-y-2">
              <Label>Logo (Dark Background)</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-32 border border-gray-700 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden">
                  {branding.logo_dark_url ? (
                    <img src={branding.logo_dark_url} alt="Company Logo (Dark)" className="h-full w-full object-contain p-2" />
                  ) : branding.logo_url ? (
                    <img src={branding.logo_url} alt="Company Logo" className="h-full w-full object-contain p-2 opacity-80" />
                  ) : (
                    <Building2 className="h-8 w-8 text-gray-500" />
                  )}
                  {uploadingLogoDark && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={logoDarkInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, true)}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => logoDarkInputRef.current?.click()}
                    disabled={uploadingLogoDark}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploadingLogoDark ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="color"
                  value={branding.primary_color}
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={branding.primary_color}
                  onChange={(e) => setBranding({...branding, primary_color: e.target.value})}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="color"
                  value={branding.secondary_color}
                  onChange={(e) => setBranding({...branding, secondary_color: e.target.value})}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={branding.secondary_color}
                  onChange={(e) => setBranding({...branding, secondary_color: e.target.value})}
                  placeholder="#1e40af"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company NMLS ID</Label>
              <Input 
                value={branding.nmls_id}
                onChange={(e) => setBranding({...branding, nmls_id: e.target.value})}
                placeholder="123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                value={branding.phone}
                onChange={(e) => setBranding({...branding, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input 
              value={branding.address}
              onChange={(e) => setBranding({...branding, address: e.target.value})}
              placeholder="123 Main St, Suite 100, Phoenix, AZ 85001"
            />
          </div>

          <div className="space-y-2">
            <Label>Website</Label>
            <Input 
              value={branding.website}
              onChange={(e) => setBranding({...branding, website: e.target.value})}
              placeholder="https://loandaddy.ai"
            />
          </div>

          <div className="space-y-2">
            <Label>Legal Disclaimer (Optional)</Label>
            <Textarea 
              value={branding.legal_disclaimer}
              onChange={(e) => setBranding({...branding, legal_disclaimer: e.target.value})}
              rows={3}
              placeholder="Enter any required legal disclaimers for documents..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-500 gap-2" 
              disabled={saveBrandingMutation.isPending}
            >
              {saveBrandingMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Branding
            </Button>
            {saveBrandingMutation.isSuccess && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}