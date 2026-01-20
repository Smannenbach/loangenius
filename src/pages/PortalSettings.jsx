import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PortalSettings() {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['portalSettings'],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('portalSettings', {});
        return response.data;
      } catch (e) {
        // Return defaults if function fails
        return {
          portal_enabled: true,
          portal_primary_color: '#2563eb',
          portal_secondary_color: '#1e40af',
          session_timeout_minutes: 240,
          session_max_duration_hours: 24,
          link_expiration_days: 7,
          max_file_size_mb: 25,
          allowed_file_types: 'pdf,doc,docx,jpg,jpeg,png',
          enable_borrower_messaging: true,
          enable_borrower_timeline: true,
          enable_document_notifications: true,
          enable_sms_notifications: true,
        };
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await base44.functions.invoke('portalSettings', updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portalSettings'] });
      toast.success('Portal settings saved!');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  const [formData, setFormData] = useState(settings || {});

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      action: 'update',
      ...formData,
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Portal Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portal Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="font-medium">Enable Borrower Portal</label>
                <Switch
                  checked={formData.portal_enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, portal_enabled: checked })
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">Portal URL:</p>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                  <code className="flex-1 text-sm break-all">
                    {formData.portal_subdomain
                      ? `https://${formData.portal_subdomain}.apply.loangenius.ai`
                      : 'https://apply.loangenius.ai'}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        formData.portal_subdomain
                          ? `https://${formData.portal_subdomain}.apply.loangenius.ai`
                          : 'https://apply.loangenius.ai'
                      )
                    }
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'enable_borrower_messaging', label: 'Enable borrower messaging' },
                { key: 'enable_borrower_timeline', label: 'Enable activity timeline' },
                { key: 'enable_document_notifications', label: 'Send document notifications' },
                { key: 'enable_sms_notifications', label: 'Send SMS notifications' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between">
                  <label className="font-medium text-sm">{feature.label}</label>
                  <Switch
                    checked={formData[feature.key]}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, [feature.key]: checked })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.portal_primary_color || '#2563eb'}
                    onChange={(e) =>
                      setFormData({ ...formData, portal_primary_color: e.target.value })
                    }
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.portal_primary_color || '#2563eb'}
                    onChange={(e) =>
                      setFormData({ ...formData, portal_primary_color: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.portal_secondary_color || '#1e40af'}
                    onChange={(e) =>
                      setFormData({ ...formData, portal_secondary_color: e.target.value })
                    }
                    className="h-10 w-16 rounded cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.portal_secondary_color || '#1e40af'}
                    onChange={(e) =>
                      setFormData({ ...formData, portal_secondary_color: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subdomain</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium mb-2">Custom Subdomain</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={formData.portal_subdomain || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, portal_subdomain: e.target.value })
                    }
                    placeholder="mycompany"
                    className="flex-1"
                  />
                  <span className="text-gray-600">.apply.loangenius.ai</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Timeout (minutes)
                </label>
                <Input
                  type="number"
                  value={formData.session_timeout_minutes || 240}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      session_timeout_minutes: parseInt(e.target.value),
                    })
                  }
                  min="5"
                  max="1440"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Session Duration (hours)
                </label>
                <Input
                  type="number"
                  value={formData.session_max_duration_hours || 24}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      session_max_duration_hours: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="168"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Magic Link Expiration (days)
                </label>
                <Input
                  type="number"
                  value={formData.link_expiration_days || 7}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      link_expiration_days: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="30"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>File Upload Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max File Size (MB)</label>
                <Input
                  type="number"
                  value={formData.max_file_size_mb || 25}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_file_size_mb: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Allowed File Types</label>
                <Input
                  type="text"
                  value={formData.allowed_file_types || 'pdf,doc,docx,jpg,jpeg,png'}
                  onChange={(e) =>
                    setFormData({ ...formData, allowed_file_types: e.target.value })
                  }
                  placeholder="pdf,doc,docx,jpg,jpeg,png"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Document Checklist Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Configure which documents borrowers need to upload based on loan type and purpose.</p>
              <div className="space-y-3">
                {['DSCR Purchase', 'DSCR Refinance', 'Cash-Out Refinance', 'Commercial Loan'].map((template) => (
                  <div key={template} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{template}</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={createPageUrl(`DocumentTemplates?type=${encodeURIComponent(template)}`)}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={() => window.history.back()} type="button">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  );
}