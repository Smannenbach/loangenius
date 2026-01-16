import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileOutput,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

export default function MISMOExportProfiles() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [newProfile, setNewProfile] = useState({
    profile_name: '',
    platform: 'MISMO_34',
    version: '3.4.0',
    extension_namespace: 'LG',
    is_default: false,
    mapping_json: {},
  });

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

  const orgId = memberships[0]?.org_id || user?.org_id || 'default';

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['exportProfiles', orgId],
    queryFn: async () => {
      try {
        return await base44.entities.FieldMappingProfile.filter({ org_id: orgId });
      } catch {
        return [];
      }
    },
    enabled: true,
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.FieldMappingProfile.create({
        org_id: orgId,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportProfiles'] });
      setIsAddOpen(false);
      resetForm();
      toast.success('Profile created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create profile: ' + error.message);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.FieldMappingProfile.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportProfiles'] });
      setIsAddOpen(false);
      setEditingProfile(null);
      resetForm();
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldMappingProfile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportProfiles'] });
      toast.success('Profile deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete profile: ' + error.message);
    },
  });

  const duplicateProfileMutation = useMutation({
    mutationFn: async (profile) => {
      return base44.entities.FieldMappingProfile.create({
        org_id: orgId,
        profile_name: `${profile.profile_name} (Copy)`,
        platform: profile.platform,
        version: profile.version,
        extension_namespace: profile.extension_namespace,
        mapping_json: profile.mapping_json,
        is_default: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportProfiles'] });
      toast.success('Profile duplicated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to duplicate profile: ' + error.message);
    },
  });

  const handleSave = () => {
    if (!newProfile.profile_name) {
      toast.error('Profile name is required');
      return;
    }

    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, data: newProfile });
    } else {
      createProfileMutation.mutate(newProfile);
    }
  };

  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setNewProfile({
      profile_name: profile.profile_name,
      platform: profile.platform,
      version: profile.version,
      extension_namespace: profile.extension_namespace,
      is_default: profile.is_default,
      mapping_json: profile.mapping_json,
    });
    setIsAddOpen(true);
  };

  const resetForm = () => {
    setNewProfile({
      profile_name: '',
      platform: 'MISMO_34',
      version: '3.4.0',
      extension_namespace: 'LG',
      is_default: false,
      mapping_json: {},
    });
    setEditingProfile(null);
  };

  const filteredProfiles = profiles.filter(p =>
    p.profile_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.platform?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileOutput className="h-8 w-8 text-blue-600" />
            MISMO Export Profiles
          </h1>
          <p className="text-gray-500 mt-1">Manage field mapping configurations for MISMO 3.4 exports</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 gap-2">
              <Plus className="h-4 w-4" />
              New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProfile ? 'Edit Profile' : 'Create Export Profile'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Profile Name *</Label>
                <Input
                  value={newProfile.profile_name}
                  onChange={(e) => setNewProfile({ ...newProfile, profile_name: e.target.value })}
                  placeholder="Default MISMO 3.4 Profile"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Platform *</Label>
                  <Select value={newProfile.platform} onValueChange={(v) => setNewProfile({ ...newProfile, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MISMO_34">MISMO 3.4</SelectItem>
                      <SelectItem value="Encompass">Encompass</SelectItem>
                      <SelectItem value="LendingPad">LendingPad</SelectItem>
                      <SelectItem value="Arive">Arive</SelectItem>
                      <SelectItem value="LendingWise">LendingWise</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Version</Label>
                  <Input
                    value={newProfile.version}
                    onChange={(e) => setNewProfile({ ...newProfile, version: e.target.value })}
                    placeholder="3.4.0"
                  />
                </div>
              </div>
              <div>
                <Label>Extension Namespace</Label>
                <Input
                  value={newProfile.extension_namespace}
                  onChange={(e) => setNewProfile({ ...newProfile, extension_namespace: e.target.value })}
                  placeholder="LG"
                  maxLength={10}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="default"
                  checked={newProfile.is_default}
                  onChange={(e) => setNewProfile({ ...newProfile, is_default: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="default" className="text-sm font-medium">Set as default profile</label>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-500"
                  onClick={handleSave}
                  disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
                >
                  {createProfileMutation.isPending || updateProfileMutation.isPending
                    ? 'Saving...'
                    : editingProfile ? 'Update Profile' : 'Create Profile'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Profiles Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading profiles...</p>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileOutput className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No export profiles yet</h3>
            <p className="text-gray-500 mb-4">Create your first MISMO export profile to customize field mappings</p>
            <Button onClick={() => setIsAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{profile.profile_name}</CardTitle>
                  {profile.is_default && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform:</span>
                    <Badge variant="outline">{profile.platform}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Version:</span>
                    <span className="font-medium">{profile.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Namespace:</span>
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{profile.extension_namespace}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(profile)}
                    className="flex-1 gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicateProfileMutation.mutate(profile)}
                    className="flex-1 gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this profile?')) {
                        deleteProfileMutation.mutate(profile.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}