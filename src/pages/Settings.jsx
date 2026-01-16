import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import {
  Settings,
  User,
  Building2,
  Bell,
  Save,
  Check,
  Loader2,
  Upload,
} from 'lucide-react';
import debounce from 'lodash/debounce';

export default function SettingsPage() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    nmls_id: '',
    headshot_url: '',
  });

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
        headshot_url: user.headshot_url || '',
      }));
    }
  }, [user]);

  const [notifications, setNotifications] = useState({
    email_new_lead: true,
    email_document_upload: true,
    email_status_change: true,
    sms_urgent: false,
  });

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <Settings className="h-7 w-7 text-blue-600" />
          Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Building2 className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Headshot Upload */}
              <div className="space-y-2">
                <Label>Professional Headshot</Label>
                <div className="flex items-center gap-4">
                  {profile.headshot_url && (
                    <img src={profile.headshot_url} alt="Headshot" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const { data } = await base44.functions.invoke('uploadUserHeadshot', formData);
                          setProfile({ ...profile, headshot_url: data.url });
                        } catch (err) {
                          console.error('Upload failed:', err);
                          alert('Upload failed: ' + err.message);
                        }
                      }
                    }}
                    className="block"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>NMLS ID</Label>
                  <Input
                    value={profile.nmls_id}
                    onChange={(e) => setProfile({ ...profile, nmls_id: e.target.value })}
                    placeholder="123456"
                  />
                </div>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-500 gap-2"
                onClick={async () => {
                  try {
                    await base44.auth.updateMe({
                      full_name: profile.full_name,
                      phone: profile.phone,
                      nmls_id: profile.nmls_id,
                      headshot_url: profile.headshot_url,
                    });
                    alert('Profile saved successfully!');
                  } catch (err) {
                    alert('Error saving profile: ' + err.message);
                  }
                }}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Configure your company information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center">
                    {/* Logo preview would go here */}
                    <p className="text-xs text-gray-500">Logo</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          const { data } = await base44.functions.invoke('uploadOrgLogo', formData);
                          console.log('Logo uploaded:', data.url);
                          alert('Logo uploaded successfully!');
                        } catch (err) {
                          console.error('Upload failed:', err);
                          alert('Upload failed: ' + err.message);
                        }
                      }
                    }}
                    className="block"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input placeholder="ABC Mortgage" />
                </div>
                <div className="space-y-2">
                  <Label>Company NMLS ID</Label>
                  <Input placeholder="123456" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input placeholder="123 Main St, City, State 12345" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input placeholder="(555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input placeholder="https://abcmortgage.com" />
                </div>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-500 gap-2"
                onClick={() => alert('Organization settings saved!')}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Lead Notifications</p>
                    <p className="text-sm text-gray-500">Get notified when a new lead is created</p>
                  </div>
                  <Switch
                    checked={notifications.email_new_lead}
                    onCheckedChange={(v) => setNotifications({ ...notifications, email_new_lead: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Document Uploads</p>
                    <p className="text-sm text-gray-500">Get notified when documents are uploaded</p>
                  </div>
                  <Switch
                    checked={notifications.email_document_upload}
                    onCheckedChange={(v) => setNotifications({ ...notifications, email_document_upload: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Status Changes</p>
                    <p className="text-sm text-gray-500">Get notified when deal status changes</p>
                  </div>
                  <Switch
                    checked={notifications.email_status_change}
                    onCheckedChange={(v) => setNotifications({ ...notifications, email_status_change: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS for Urgent Items</p>
                    <p className="text-sm text-gray-500">Receive SMS for urgent notifications</p>
                  </div>
                  <Switch
                    checked={notifications.sms_urgent}
                    onCheckedChange={(v) => setNotifications({ ...notifications, sms_urgent: v })}
                  />
                </div>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-500 gap-2"
                onClick={() => alert('Notification preferences saved!')}
              >
                <Save className="h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Company Branding</CardTitle>
              <CardDescription>Customize company appearance on documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Configure your logo, colors, and contact info that appears on generated documents and exports.</p>
              <Button 
                className="bg-blue-600 hover:bg-blue-500"
                onClick={() => window.location.href = '/BrandingSettings'}
              >
                Edit Branding
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}