import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Brain, Zap, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminAIProviders() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [editProvider, setEditProvider] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const queryClient = useQueryClient();
  const { orgId } = useOrgId();
  
  // Form state for new provider
  const [formData, setFormData] = useState({
    provider_name: 'OpenAI',
    model_name: '',
    api_key: '',
    api_base_url: '',
    max_tokens: 2000,
    temperature: 0.7
  });
  
  // Settings state
  const [settings, setSettings] = useState({
    auto_analyze: true,
    analysis_depth: 'standard',
    confidence_threshold: 80
  });
  
  // Load settings from OrgSettings
  const { data: orgSettings } = useQuery({
    queryKey: ['orgSettings', orgId, 'ai_settings'],
    queryFn: async () => {
      if (!orgId) return null;
      const results = await base44.entities.OrgSettings.filter({ 
        org_id: orgId, 
        setting_key: 'ai_settings' 
      });
      return results[0] || null;
    },
    enabled: !!orgId
  });
  
  // Initialize settings from saved data
  useEffect(() => {
    if (orgSettings?.setting_value) {
      try {
        const saved = typeof orgSettings.setting_value === 'string' 
          ? JSON.parse(orgSettings.setting_value) 
          : orgSettings.setting_value;
        setSettings(prev => ({ ...prev, ...saved }));
      } catch (e) {
        console.log('Could not parse settings');
      }
    }
  }, [orgSettings]);

  const { data: providers = [] } = useQuery({
    queryKey: ['aiProviders', orgId],
    queryFn: () => base44.entities.AIProvider.filter({ org_id: orgId }),
    enabled: !!orgId
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerId) => {
      setTestingId(providerId);
      return base44.functions.invoke('testAIProvider', { provider_id: providerId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders', orgId] });
      setTestingId(null);
      if (data?.data?.success) {
        toast.success(data?.data?.message || 'Provider test successful');
      } else {
        toast.error(data?.data?.message || 'Provider test failed');
      }
    },
    onError: (error) => {
      setTestingId(null);
      toast.error(error.message || 'Failed to test provider');
    }
  });
  
  const createProviderMutation = useMutation({
    mutationFn: async (data) => {
      if (!orgId) throw new Error('No organization found');
      return base44.entities.AIProvider.create({
        org_id: orgId,
        provider_name: data.provider_name,
        model_name: data.model_name,
        api_key_encrypted: data.api_key, // Will be encrypted server-side in production
        api_base_url: data.api_base_url || null,
        max_tokens: parseInt(data.max_tokens) || 2000,
        temperature: parseFloat(data.temperature) || 0.7,
        is_active: true,
        is_default: false,
        status: 'PENDING',
        usage_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders', orgId] });
      setShowNewForm(false);
      setFormData({
        provider_name: 'OpenAI',
        model_name: '',
        api_key: '',
        api_base_url: '',
        max_tokens: 2000,
        temperature: 0.7
      });
      toast.success('Provider created successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create provider');
    }
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const deleteProviderMutation = useMutation({
    mutationFn: (providerId) => base44.entities.AIProvider.delete(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders', orgId] });
      setDeleteConfirmId(null);
      toast.success('Provider deleted');
    },
    onError: (error) => {
      setDeleteConfirmId(null);
      toast.error(error.message || 'Failed to delete provider');
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (providerId) => {
      // First unset any existing defaults
      const currentDefaults = providers.filter(p => p.is_default);
      for (const p of currentDefaults) {
        await base44.entities.AIProvider.update(p.id, { is_default: false });
      }
      // Set new default
      return base44.entities.AIProvider.update(providerId, { is_default: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders', orgId] });
      toast.success('Default provider updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to set default');
    }
  });
  
  const handleSaveProvider = () => {
    if (!formData.model_name) {
      toast.error('Model name is required');
      return;
    }
    createProviderMutation.mutate(formData);
  };
  
  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No organization found');
      
      const existingSettings = await base44.entities.OrgSettings.filter({
        org_id: orgId,
        setting_key: 'ai_settings'
      });
      
      const settingData = {
        org_id: orgId,
        setting_key: 'ai_settings',
        setting_value: JSON.stringify(settings)
      };
      
      if (existingSettings.length > 0) {
        return base44.entities.OrgSettings.update(existingSettings[0].id, settingData);
      } else {
        return base44.entities.OrgSettings.create(settingData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgSettings', orgId, 'ai_settings'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save settings');
    }
  });
  
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate();
  };

  const getStatusIcon = (status) => {
    if (status === 'CONNECTED') return <Check className="h-4 w-4 text-green-600" />;
    if (status === 'ERROR') return <AlertCircle className="h-4 w-4 text-red-600" />;
    return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">AI Providers</h1>
        </div>
        <Button onClick={() => setShowNewForm(true)} className="bg-blue-600">
          <Zap className="h-4 w-4 mr-2" />
          Add Provider
        </Button>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Configured Providers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Providers List */}
        <TabsContent value="providers" className="space-y-4">
          {providers.length === 0 ? (
            <Card>
              <CardContent className="pt-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-4">No AI providers configured yet</p>
                <Button onClick={() => setShowNewForm(true)}>Configure First Provider</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {providers.map(provider => (
                <Card key={provider.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">{provider.provider_name}</h3>
                          <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                            {provider.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant={provider.is_default ? 'default' : 'outline'}>
                            {provider.is_default ? 'Default' : ''}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <p className="text-xs text-gray-500">Model</p>
                            <p className="font-medium">{provider.model_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(provider.status)}
                              <span>{provider.status}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Usage</p>
                            <p className="font-medium">{provider.usage_count} calls</p>
                          </div>
                        </div>
                        {provider.last_error && (
                          <p className="text-sm text-red-600 mt-2">Error: {provider.last_error}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testProviderMutation.mutate(provider.id)}
                          disabled={testingId === provider.id}
                        >
                          {testingId === provider.id ? 'Testing...' : 'Test'}
                        </Button>
                        {!provider.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDefaultMutation.mutate(provider.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditProvider(provider)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirmId(provider.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Auto-analyze New Documents</label>
                <input 
                  type="checkbox" 
                  checked={settings.auto_analyze}
                  onChange={(e) => setSettings({...settings, auto_analyze: e.target.checked})}
                  className="h-4 w-4" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Default Analysis Depth</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={settings.analysis_depth}
                  onChange={(e) => setSettings({...settings, analysis_depth: e.target.value})}
                >
                  <option value="quick">Quick (Classification only)</option>
                  <option value="standard">Standard (Classification + Extraction)</option>
                  <option value="comprehensive">Comprehensive (Full Analysis)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confidence Threshold</label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={settings.confidence_threshold}
                  onChange={(e) => setSettings({...settings, confidence_threshold: parseInt(e.target.value) || 80})}
                />
                <p className="text-xs text-gray-600 mt-1">Only accept results with this confidence or higher</p>
              </div>
              <Button 
                className="bg-blue-600" 
                onClick={handleSaveSettings}
                disabled={saveSettingsMutation.isPending}
              >
                {saveSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this provider configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteProviderMutation.mutate(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Provider Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowNewForm(false)}>
          <Card className="fixed inset-4 max-w-2xl mx-auto z-50 overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Add AI Provider</CardTitle>
              <button onClick={() => setShowNewForm(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <select 
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.provider_name}
                  onChange={(e) => setFormData({...formData, provider_name: e.target.value})}
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="Google">Google</option>
                  <option value="Azure">Azure</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <Input 
                  placeholder="e.g., gpt-4-turbo, claude-3-opus" 
                  value={formData.model_name}
                  onChange={(e) => setFormData({...formData, model_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Key (Optional - uses environment secrets)</label>
                <Input 
                  type="password" 
                  placeholder="Leave blank to use environment secrets" 
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">API keys are stored in environment secrets. This field is for override only.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">API Base URL (Optional)</label>
                <Input 
                  placeholder="https://api.example.com" 
                  value={formData.api_base_url}
                  onChange={(e) => setFormData({...formData, api_base_url: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Max Tokens</label>
                  <Input 
                    type="number" 
                    value={formData.max_tokens}
                    onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value) || 2000})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Temperature</label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="2" 
                    step="0.1" 
                    value={formData.temperature}
                    onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value) || 0.7})}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="bg-blue-600 flex-1" 
                  onClick={handleSaveProvider}
                  disabled={createProviderMutation.isPending}
                >
                  {createProviderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : 'Save Provider'}
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Edit Provider Modal */}
      {editProvider && (
        <EditProviderModal
          provider={editProvider}
          orgId={orgId}
          onClose={() => setEditProvider(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['aiProviders', orgId] });
            setEditProvider(null);
          }}
        />
      )}
    </div>
  );
}

function EditProviderModal({ provider, orgId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    provider_name: provider.provider_name || 'OpenAI',
    model_name: provider.model_name || '',
    api_key: '',
    api_base_url: provider.api_base_url || '',
    max_tokens: provider.max_tokens || 2000,
    temperature: provider.temperature || 0.7,
    is_active: provider.is_active !== false
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = {
        provider_name: data.provider_name,
        model_name: data.model_name,
        api_base_url: data.api_base_url || null,
        max_tokens: parseInt(data.max_tokens) || 2000,
        temperature: parseFloat(data.temperature) || 0.7,
        is_active: data.is_active
      };
      // Only update API key if provided
      if (data.api_key) {
        updateData.api_key_encrypted = data.api_key;
      }
      return base44.entities.AIProvider.update(provider.id, updateData);
    },
    onSuccess: () => {
      toast.success('Provider updated successfully');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update provider');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.model_name) {
      toast.error('Model name is required');
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>
      <Card className="fixed inset-4 max-w-2xl mx-auto z-50 overflow-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Edit AI Provider</CardTitle>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Provider</Label>
              <select 
                className="w-full px-3 py-2 border rounded-md mt-1"
                value={formData.provider_name}
                onChange={(e) => setFormData({...formData, provider_name: e.target.value})}
              >
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google">Google</option>
                <option value="Azure">Azure</option>
              </select>
            </div>
            <div>
              <Label>Model</Label>
              <Input 
                placeholder="e.g., gpt-4-turbo, claude-3-opus" 
                value={formData.model_name}
                onChange={(e) => setFormData({...formData, model_name: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label>API Key (leave blank to keep existing)</Label>
              <Input 
                type="password" 
                placeholder="Enter new API key to change" 
                value={formData.api_key}
                onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <Label>API Base URL (Optional)</Label>
              <Input 
                placeholder="https://api.example.com" 
                value={formData.api_base_url}
                onChange={(e) => setFormData({...formData, api_base_url: e.target.value})}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Tokens</Label>
                <Input 
                  type="number" 
                  value={formData.max_tokens}
                  onChange={(e) => setFormData({...formData, max_tokens: parseInt(e.target.value) || 2000})}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="2" 
                  step="0.1" 
                  value={formData.temperature}
                  onChange={(e) => setFormData({...formData, temperature: parseFloat(e.target.value) || 0.7})}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                type="submit"
                className="bg-blue-600 flex-1" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}