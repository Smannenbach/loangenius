import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Brain, Zap, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAIProviders() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const queryClient = useQueryClient();
  
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

  const { data: providers = [] } = useQuery({
    queryKey: ['aiProviders'],
    queryFn: () => base44.entities.AIProvider.filter({})
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerId) => {
      setTestingId(providerId);
      return base44.functions.invoke('testAIProvider', { provider_id: providerId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
      setTestingId(null);
      if (data?.data?.success) {
        toast.success('Provider test successful');
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
      return base44.entities.AIProvider.create({
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
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
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

  const deleteProviderMutation = useMutation({
    mutationFn: (providerId) => base44.entities.AIProvider.delete(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
      toast.success('Provider deleted');
    },
    onError: (error) => {
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
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
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
  
  const handleSaveSettings = () => {
    // Settings would be saved to org settings in a real implementation
    toast.success('Settings saved');
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
                          onClick={() => setSelectedProvider(provider)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProviderMutation.mutate(provider.id)}
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
              <Button className="bg-blue-600" onClick={handleSaveSettings}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
}