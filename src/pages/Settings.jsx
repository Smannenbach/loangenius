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
import { PageHeader } from '@/components/Breadcrumbs';
import {
  Settings,
  User,
  Building2,
  Bell,
  Save,
  Check,
  Loader2,
  Upload,
  Shield,
  Keyboard,
  Palette,
  Eye,
  EyeOff,
} from 'lucide-react';
import debounce from 'lodash/debounce';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

function OrgLogoUpload({ orgId, orgSettings, refetchOrgSettings }) {
  const [logoUrl, setLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (orgSettings?.logo_url) {
      setLogoUrl(orgSettings.logo_url);
    }
  }, [orgSettings]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload using Core.UploadFile integration directly
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setLogoUrl(file_url);

      // Save to OrgSettings
      if (orgSettings?.id) {
        await base44.entities.OrgSettings.update(orgSettings.id, { logo_url: file_url });
      } else if (orgId) {
        await base44.entities.OrgSettings.create({ org_id: orgId, logo_url: file_url });
      }
      
      toast.success('Logo uploaded successfully');
      refetchOrgSettings();
    } catch (err) {
      console.error('Logo upload failed:', err);
      toast.error('Logo upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Company Logo</Label>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Company Logo" className="h-full w-full object-contain" />
          ) : (
            <Building2 className="h-8 w-8 text-gray-400" />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Logo'}
          </Button>
          <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB recommended</p>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, description }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-700">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded shadow-sm"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: user, refetch: refetchUser } = useQuery({
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

  // Organization form state
  const [orgForm, setOrgForm] = useState({
    company_name: '',
    nmls_id: '',
    address: '',
    phone: '',
    website: '',
  });

  // Load org settings into form
  useEffect(() => {
    if (orgSettings) {
      setOrgForm({
        company_name: orgSettings.company_name || '',
        nmls_id: orgSettings.nmls_id || '',
        address: orgSettings.address || '',
        phone: orgSettings.phone || '',
        website: orgSettings.website || '',
      });
    }
  }, [orgSettings]);

  // Save organization settings mutation
  const saveOrgMutation = useMutation({
    mutationFn: async (data) => {
      if (orgSettings?.id) {
        return await base44.entities.OrgSettings.update(orgSettings.id, data);
      } else if (orgId) {
        return await base44.entities.OrgSettings.create({ org_id: orgId, ...data });
      }
      throw new Error('No organization ID');
    },
    onSuccess: () => {
      toast.success('Organization settings saved!');
      refetchOrgSettings();
    },
    onError: (err) => toast.error('Failed to save: ' + err.message),
  });

  // Save notification preferences mutation
  const saveNotificationsMutation = useMutation({
    mutationFn: async (prefs) => {
      return await base44.auth.updateMe({ notification_preferences: prefs });
    },
    onSuccess: () => {
      toast.success('Notification preferences saved!');
    },
    onError: (err) => toast.error('Failed to save: ' + err.message),
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
      <PageHeader
        title="Settings"
        description="Manage your account, organization, and preferences"
        currentPage="Settings"
        className="mb-8"
      />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 flex-wrap">
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
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="shortcuts" className="gap-2">
            <Keyboard className="h-4 w-4" />
            Shortcuts
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
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
              <OrgLogoUpload orgId={orgId} orgSettings={orgSettings} refetchOrgSettings={refetchOrgSettings} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input 
                    value={orgForm.company_name}
                    onChange={(e) => setOrgForm({ ...orgForm, company_name: e.target.value })}
                    placeholder="ABC Mortgage" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company NMLS ID</Label>
                  <Input 
                    value={orgForm.nmls_id}
                    onChange={(e) => setOrgForm({ ...orgForm, nmls_id: e.target.value })}
                    placeholder="123456" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Address</Label>
                  <Input 
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    placeholder="(555) 123-4567" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    value={orgForm.website}
                    onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                    placeholder="https://abcmortgage.com" 
                  />
                </div>
              </div>
              <Button 
                className="bg-blue-600 hover:bg-blue-500 gap-2"
                onClick={() => saveOrgMutation.mutate(orgForm)}
                disabled={saveOrgMutation.isPending}
              >
                {saveOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                onClick={() => saveNotificationsMutation.mutate(notifications)}
                disabled={saveNotificationsMutation.isPending}
              >
                {saveNotificationsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 font-medium">
                    <Check className="h-4 w-4" />
                    Your account is secured with SSO
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    You sign in using your organization's identity provider
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Session Management</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-logout after inactivity</p>
                      <p className="text-sm text-gray-500">Automatically sign out after 30 minutes of inactivity</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable 2FA</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                    </div>
                    <Button variant="outline" onClick={() => toast.info('2FA setup coming soon')}>
                      Set Up
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Active Sessions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Current Session</p>
                        <p className="text-xs text-gray-500">Chrome on macOS • Last active: Now</p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => toast.success('Signed out of all other sessions')}
                  >
                    Sign Out All Other Sessions
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shortcuts">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>Quick keys to navigate and perform actions faster</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3 text-gray-700">Global Shortcuts</h3>
                  <div className="grid gap-2">
                    <ShortcutRow keys={['⌘', 'K']} description="Open global search" />
                    <ShortcutRow keys={['N']} description="New loan application" />
                    <ShortcutRow keys={['L']} description="Go to Leads" />
                    <ShortcutRow keys={['P']} description="Go to Pipeline" />
                    <ShortcutRow keys={['D']} description="Go to Documents" />
                    <ShortcutRow keys={['C']} description="Go to Contacts" />
                    <ShortcutRow keys={['Q']} description="Go to Quote Generator" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3 text-gray-700">Page-Specific Shortcuts</h3>
                  <div className="grid gap-2">
                    <ShortcutRow keys={['/']} description="Focus search input" />
                    <ShortcutRow keys={['A']} description="Add new item (on list pages)" />
                    <ShortcutRow keys={['T']} description="Toggle view mode (table/cards)" />
                    <ShortcutRow keys={['Esc']} description="Close modal / Clear search" />
                    <ShortcutRow keys={['↑', '↓']} description="Navigate search results" />
                    <ShortcutRow keys={['Enter']} description="Select highlighted item" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3 text-gray-700">Preferences</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable keyboard shortcuts</p>
                      <p className="text-sm text-gray-500">Turn off if shortcuts conflict with other tools</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
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
              <Link to={createPageUrl('BrandingSettings')}>
                <Button className="bg-blue-600 hover:bg-blue-500">
                  Edit Branding
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}