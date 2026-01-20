import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenant } from '@/components/TenantProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Image, Type, Eye, Loader2, Upload, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function TenantBrandingSettings() {
  const { tenant_id, role, branding: currentBranding } = useTenant();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    app_name: 'LoanGenius',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    accent_color: '#7c3aed',
    logo_light_url: '',
    logo_dark_url: '',
    favicon_url: '',
    font_family: 'Inter, sans-serif',
    border_radius: '0.5rem',
    button_style: 'rounded',
    support_email: '',
    support_phone: '',
    company_address: '',
    nmls_id: '',
    hide_powered_by: false,
    custom_css: '',
    ...currentBranding
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateTenantBranding', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantContext'] });
      toast.success('Branding updated! Reload the page to see changes.');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const uploadData = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, [field]: uploadData.file_url });
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  if (!['tenant_admin', 'admin'].includes(role)) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="h-7 w-7 text-blue-600" />
            White-Label Branding
          </h1>
          <p className="text-gray-500 mt-1">Customize the look and feel of your platform</p>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="logos">Logos & Images</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Application Name</Label>
                <Input
                  value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  placeholder="LoanGenius"
                />
                <p className="text-xs text-gray-500 mt-1">This replaces "LoanGenius" throughout the app</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={formData.support_email}
                    onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                    placeholder="support@yourcompany.com"
                  />
                </div>
                <div>
                  <Label>Support Phone</Label>
                  <Input
                    value={formData.support_phone}
                    onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
              <div>
                <Label>Company Address</Label>
                <Input
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  placeholder="123 Main St, Suite 100, Los Angeles, CA 90001"
                />
              </div>
              <div>
                <Label>NMLS License #</Label>
                <Input
                  value={formData.nmls_id}
                  onChange={(e) => setFormData({ ...formData, nmls_id: e.target.value })}
                  placeholder="123456"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Hide "Powered by LoanGenius"</p>
                  <p className="text-sm text-gray-500">Remove branding footer from portal</p>
                </div>
                <Switch
                  checked={formData.hide_powered_by}
                  onCheckedChange={(checked) => setFormData({ ...formData, hide_powered_by: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logos">
          <Card>
            <CardHeader>
              <CardTitle>Logos & Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Logo (Light Background)</Label>
                <div className="flex items-center gap-4 mt-2">
                  {formData.logo_light_url && (
                    <img src={formData.logo_light_url} alt="Logo" className="h-12 object-contain" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo_light_url')}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label>Logo (Dark Background)</Label>
                <div className="flex items-center gap-4 mt-2">
                  {formData.logo_dark_url && (
                    <div className="p-4 bg-slate-800 rounded">
                      <img src={formData.logo_dark_url} alt="Logo Dark" className="h-12 object-contain" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'logo_dark_url')}
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <Label>Favicon</Label>
                <input
                  type="file"
                  accept="image/x-icon,image/png"
                  onChange={(e) => handleFileUpload(e, 'favicon_url')}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">32x32 PNG or ICO file</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Primary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#2563eb"
                    />
                  </div>
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                      placeholder="#7c3aed"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Font Family</Label>
                <Input
                  value={formData.font_family}
                  onChange={(e) => setFormData({ ...formData, font_family: e.target.value })}
                  placeholder="Inter, sans-serif"
                />
              </div>
              <div>
                <Label>Google Fonts URL (optional)</Label>
                <Input
                  value={formData.font_url}
                  onChange={(e) => setFormData({ ...formData, font_url: e.target.value })}
                  placeholder="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                />
              </div>
              <div>
                <Label>Border Radius</Label>
                <Input
                  value={formData.border_radius}
                  onChange={(e) => setFormData({ ...formData, border_radius: e.target.value })}
                  placeholder="0.5rem"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Custom CSS</Label>
                <Textarea
                  value={formData.custom_css}
                  onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                  placeholder=".custom-button { border-radius: 999px; }"
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Advanced: Add custom CSS to override default styles
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 rounded-lg border" style={{
                backgroundColor: formData.background_color,
                color: formData.text_color,
                fontFamily: formData.font_family
              }}>
                <h2 className="text-2xl font-bold mb-4">{formData.app_name}</h2>
                <button
                  className="px-4 py-2 text-white font-medium"
                  style={{
                    backgroundColor: formData.primary_color,
                    borderRadius: formData.border_radius
                  }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 text-white font-medium ml-3"
                  style={{
                    backgroundColor: formData.secondary_color,
                    borderRadius: formData.border_radius
                  }}
                >
                  Secondary Button
                </button>
              </div>
              <p className="text-sm text-gray-500 italic">
                Save and reload the page to see full branding applied across the app
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}