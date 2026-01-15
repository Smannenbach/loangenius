import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Brain, Zap, Check, AlertCircle } from 'lucide-react';

export default function AdminAIProviders() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: providers = [] } = useQuery({
    queryKey: ['aiProviders'],
    queryFn: () => base44.entities.AIProvider.filter({})
  });

  const testProviderMutation = useMutation({
    mutationFn: (providerId) => base44.functions.invoke('testAIProvider', { provider_id: providerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
      setTestingId(null);
    }
  });

  const deleteProviderMutation = useMutation({
    mutationFn: (providerId) => base44.entities.AIProvider.delete(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
    }
  });

  const setDefaultMutation = useMutation({
    mutationFn: (providerId) => base44.entities.AIProvider.update(providerId, { is_default: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiProviders'] });
    }
  });

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
                <input type="checkbox" defaultChecked className="h-4 w-4" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Default Analysis Depth</label>
                <select className="w-full px-3 py-2 border rounded-md">
                  <option>Quick (Classification only)</option>
                  <option selected>Standard (Classification + Extraction)</option>
                  <option>Comprehensive (Full Analysis)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Confidence Threshold</label>
                <Input type="number" min="0" max="100" defaultValue="80" />
                <p className="text-xs text-gray-600 mt-1">Only accept results with this confidence or higher</p>
              </div>
              <Button className="bg-blue-600">Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Provider Modal */}
      {showNewForm && (
        <Card className="fixed inset-4 max-w-2xl mx-auto z-50 overflow-auto">
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Add AI Provider</CardTitle>
            <button onClick={() => setShowNewForm(false)} className="text-gray-500 hover:text-gray-700">✕</button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Provider</label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option>OpenAI</option>
                <option>Anthropic</option>
                <option>Google</option>
                <option>Azure</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Model</label>
              <Input placeholder="e.g., gpt-4-turbo, claude-3-opus" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <Input type="password" placeholder="Enter API key" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">API Base URL (Optional)</label>
              <Input placeholder="https://api.example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Tokens</label>
                <Input type="number" defaultValue="2000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Temperature</label>
                <Input type="number" min="0" max="2" step="0.1" defaultValue="0.7" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-blue-600 flex-1">Save Provider</Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}