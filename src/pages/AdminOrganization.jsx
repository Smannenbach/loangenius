import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Palette, Globe, Settings, Zap, BarChart3 } from 'lucide-react';

export default function AdminOrganization() {
  const [selectedTab, setSelectedTab] = useState('general');
  const queryClient = useQueryClient();

  const { data: org } = useQuery({
    queryKey: ['org'],
    queryFn: () => base44.auth.me().then(u => ({ id: u.id, name: u.full_name }))
  });

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: () => base44.entities.OrganizationBranding.filter({}).then(b => b[0] || {})
  });

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Organization Settings</h1>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Organization Name</label>
                <Input defaultValue={org?.name} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Legal Name</label>
                <Input />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">NMLS ID</label>
                  <Input />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">EIN</label>
                  <Input type="password" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Billing Email</label>
                <Input type="email" />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium mb-2">Logo (Light)</label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  {branding?.logo_url ? (
                    <img src={branding.logo_url} alt="logo" className="h-12 mx-auto mb-2" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  )}
                  <p className="text-sm text-gray-600">Click or drag to upload</p>
                </div>
              </div>

              {/* Color Picker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      defaultValue={branding?.primary_color || '#2563eb'}
                      className="h-10 w-20 rounded"
                    />
                    <Input
                      defaultValue={branding?.primary_color || '#2563eb'}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Secondary Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      defaultValue={branding?.secondary_color || '#1e40af'}
                      className="h-10 w-20 rounded"
                    />
                    <Input
                      defaultValue={branding?.secondary_color || '#1e40af'}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium mb-2">Font Family</label>
                <select defaultValue={branding?.font_family || 'Inter'} className="w-full px-3 py-2 border rounded-md">
                  <option>Inter</option>
                  <option>Helvetica</option>
                  <option>Georgia</option>
                </select>
              </div>

              <Button className="bg-blue-600 hover:bg-blue-700">Save Branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domains
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button>+ Add Domain</Button>
              <div className="space-y-2">
                <div className="p-3 border rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">loangenius.example.com</p>
                    <p className="text-sm text-gray-600">Primary Domain</p>
                  </div>
                  <Badge>Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Enabled Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Deal Management', enabled: true },
                { name: 'Borrower Portal', enabled: true },
                { name: 'DocuSign Integration', enabled: true },
                { name: 'Advanced Reports', enabled: false, premium: true },
                { name: 'AI Assistant', enabled: false, premium: true }
              ].map(feature => (
                <div key={feature.name} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{feature.name}</p>
                    {feature.premium && <Badge variant="secondary">Premium</Badge>}
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={feature.enabled}
                    disabled={feature.premium && !feature.enabled}
                    className="h-5 w-5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Current Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold">5 / 10</p>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Deals Created</p>
                  <p className="text-3xl font-bold">42 / 200</p>
                </div>
                <div className="p-4 bg-purple-50 rounded">
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-3xl font-bold">2.3 GB / 25 GB</p>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <p className="text-sm text-gray-600">Documents</p>
                  <p className="text-3xl font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                <p className="text-sm opacity-90">Current Plan</p>
                <p className="text-2xl font-bold">Professional</p>
                <p className="text-sm opacity-90 mt-1">$149/month</p>
              </div>
              <Button className="gap-2">
                Upgrade Plan
              </Button>
              <Button variant="outline">View Invoice History</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}