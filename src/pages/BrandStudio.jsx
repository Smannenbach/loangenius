import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Palette, Image, Type, FileText, RotateCcw } from 'lucide-react';
import BrandingPreview from '@/components/BrandingPreview';

const FONT_OPTIONS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins'];

const PRESETS = {
  professional: {
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    accent_color: '#0891b2',
    button_style: 'rounded',
  },
  modern: {
    primary_color: '#10b981',
    secondary_color: '#059669',
    accent_color: '#f59e0b',
    button_style: 'pill',
  },
  warm: {
    primary_color: '#ea580c',
    secondary_color: '#c2410c',
    accent_color: '#f97316',
    button_style: 'sharp',
  },
};

export default function BrandStudio() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('identity');
  const [isSaving, setIsSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: branding = {}, isLoading } = useQuery({
    queryKey: ['branding', user?.org_id],
    queryFn: async () => {
      if (!user?.org_id) return null;
      const result = await base44.entities.PortalBranding.filter({ org_id: user.org_id });
      return result?.[0] || getDefaultBranding();
    },
    enabled: !!user?.org_id,
  });

  const [formData, setFormData] = useState(branding);

  React.useEffect(() => {
    setFormData(branding);
  }, [branding]);

  const saveBranding = async () => {
    setIsSaving(true);
    try {
      if (branding?.id) {
        await base44.entities.PortalBranding.update(branding.id, formData);
      } else {
        await base44.entities.PortalBranding.create({
          ...formData,
          org_id: user.org_id,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Brand settings saved successfully!');
    } catch (error) {
      toast.error('Error saving branding: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreset = (presetName) => {
    setFormData({
      ...formData,
      ...PRESETS[presetName],
    });
  };

  const handleReset = () => {
    setFormData(getDefaultBranding());
  };

  const handleLogoUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        [type === 'light' ? 'logo_light_url' : 'logo_dark_url']: url,
      });
    } catch (error) {
      toast.error('Error uploading logo: ' + error.message);
    }
  };

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Palette className="h-8 w-8 text-blue-600" />
          Brand Studio
        </h1>
        <p className="text-gray-500 mt-2">Customize your borrower portal appearance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="typography">Typography</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>

            {/* Identity Tab */}
            <TabsContent value="identity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Logos & Icons
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Logo (Light Background)</Label>
                    <p className="text-xs text-gray-500 mb-2">PNG or SVG, max 2MB</p>
                    <div className="flex items-center gap-4">
                      {formData.logo_light_url && (
                        <img src={formData.logo_light_url} alt="Light logo" className="h-12 object-contain" />
                      )}
                      <input
                        type="file"
                        accept="image/png,image/svg+xml"
                        onChange={(e) => handleLogoUpload(e, 'light')}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Logo (Dark Background)</Label>
                    <p className="text-xs text-gray-500 mb-2">PNG or SVG, max 2MB</p>
                    <div className="flex items-center gap-4">
                      {formData.logo_dark_url && (
                        <img src={formData.logo_dark_url} alt="Dark logo" className="h-12 object-contain" />
                      )}
                      <input
                        type="file"
                        accept="image/png,image/svg+xml"
                        onChange={(e) => handleLogoUpload(e, 'dark')}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Favicon URL</Label>
                    <Input
                      type="url"
                      value={formData.favicon_url || ''}
                      onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Colors Tab */}
            <TabsContent value="colors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Color Scheme
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'primary_color', label: 'Primary Color' },
                      { key: 'secondary_color', label: 'Secondary Color' },
                      { key: 'accent_color', label: 'Accent Color' },
                      { key: 'background_color', label: 'Background Color' },
                      { key: 'text_color', label: 'Text Color' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <Label>{label}</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData[key]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            className="h-10 w-20 rounded cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={formData[key]}
                            onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                            className="flex-1 text-xs font-mono"
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="block mb-3">Preset Themes</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(PRESETS).map(([name, preset]) => (
                        <Button
                          key={name}
                          variant="outline"
                          onClick={() => handlePreset(name)}
                          className="capitalize"
                        >
                          {name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button variant="outline" onClick={handleReset} className="w-full gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Type className="h-5 w-5" />
                    Fonts & Styles
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Heading Font</Label>
                    <Select
                      value={formData.font_heading}
                      onValueChange={(v) => setFormData({ ...formData, font_heading: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Body Font</Label>
                    <Select
                      value={formData.font_body}
                      onValueChange={(v) => setFormData({ ...formData, font_body: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((font) => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Button Style</Label>
                    <Select
                      value={formData.button_style}
                      onValueChange={(v) => setFormData({ ...formData, button_style: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">Rounded</SelectItem>
                        <SelectItem value="sharp">Sharp</SelectItem>
                        <SelectItem value="pill">Pill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Portal Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Welcome Message</Label>
                    <Textarea
                      value={formData.welcome_message}
                      onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                      placeholder="Welcome message shown to borrowers"
                      className="h-20"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">{formData.welcome_message?.length || 0}/500</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Support Email</Label>
                      <Input
                        type="email"
                        value={formData.support_email || ''}
                        onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                        placeholder="support@company.com"
                      />
                    </div>
                    <div>
                      <Label>Support Phone</Label>
                      <Input
                        type="tel"
                        value={formData.support_phone || ''}
                        onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                        placeholder="(555) 555-5555"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Footer Text</Label>
                    <Textarea
                      value={formData.footer_text || ''}
                      onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                      placeholder="Custom footer text with company info"
                      className="h-16"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <Button
            onClick={saveBranding}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
            size="lg"
          >
            {isSaving ? 'Saving...' : 'Save Brand Settings'}
          </Button>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <BrandingPreview branding={formData} />
        </div>
      </div>
    </div>
  );
}

function getDefaultBranding() {
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