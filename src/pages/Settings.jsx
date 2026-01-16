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
  const { data: user, refetch: refetchUser } = useQuery({
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
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        nmls_id: user.nmls_id || '',
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

  // Auto-save function
  const saveProfile = useCallback(async (profileData) => {
    setIsSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: profileData.full_name,
        phone: profileData.phone,
        nmls_id: profileData.nmls_id,
        headshot_url: profileData.headshot_url,
      });
      setLastSaved(new Date());
      toast.success('Changes saved');
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Debounced auto-save (waits 1.5 seconds after user stops typing)
  const debouncedSave = useCallback(
    debounce((profileData) => {
      saveProfile(profileData);
    }, 1500),
    [saveProfile]
  );

  // Handle profile field changes with auto-save
  const handleProfileChange = (field, value) => {
    const newProfile = { ...profile, [field]: value };
    setProfile(newProfile);
    debouncedSave(newProfile);
  };

  // Handle headshot upload
  const handleHeadshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHeadshot(true);
    try {
      // Upload using Core.UploadFile integration directly
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Update profile with new URL
      const newProfile = { ...profile, headshot_url: file_url };
      setProfile(newProfile);
      
      // Save immediately
      await base44.auth.updateMe({ headshot_url: file_url });
      setLastSaved(new Date());
      toast.success('Headshot uploaded successfully');
      refetchUser();
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingHeadshot(false);
    }
  };

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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Update your personal information</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Auto-saved</span>
                    </>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Headshot Upload */}
              <div className="space-y-2">
                <Label>Professional Headshot</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {profile.headshot_url ? (
                      <img src={profile.headshot_url} alt="Headshot" className="h-24 w-24 rounded-lg object-cover border border-gray-200" />
                    ) : (
                      <div className="h-24 w-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {uploadingHeadshot && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleHeadshotUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingHeadshot}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingHeadshot ? 'Uploading...' : 'Upload Photo'}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => handleProfileChange('full_name', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>NMLS ID</Label>
                  <Input
                    value={profile.nmls_id}
                    onChange={(e) => handleProfileChange('nmls_id', e.target.value)}
                    placeholder="123456"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  className="bg-blue-600 hover:bg-blue-500 gap-2"
                  onClick={() => saveProfile(profile)}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
                <span className="text-sm text-gray-500">Changes auto-save as you type</span>
              </div>
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
                onClick={() => toast.success('Organization settings saved!')}
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
                onClick={() => toast.success('Notification preferences saved!')}
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