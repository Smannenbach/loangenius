import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Zap,
  Mail,
  MessageSquare,
  Cloud,
  Brain,
  Database,
  FileText,
  Check,
  AlertCircle,
  Trash2,
  Loader2,
  RefreshCw,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const INTEGRATION_CATEGORIES = {
  'AI Models': [
    { name: 'Claude', icon: Brain, requiresApiKey: true, description: 'Anthropic Claude API' },
    { name: 'Google_Gemini', icon: Brain, requiresApiKey: true, description: 'Google Gemini LLM' },
    { name: 'Grok', icon: Brain, requiresApiKey: true, description: 'xAI Grok API' },
    { name: 'Perplexity', icon: Brain, requiresApiKey: true, description: 'Perplexity AI' },
    { name: 'Moonshot_AI', icon: Brain, requiresApiKey: true, description: 'Moonshot AI (Kimi)' },
    { name: 'QWEN', icon: Brain, requiresApiKey: true, description: 'Alibaba QWEN LLM' }
  ],
  'Cloud & Storage': [
    { name: 'Google_Cloud', icon: Cloud, requiresOAuth: true, description: 'Google Cloud Platform' },
    { name: 'Google_Drive', icon: Cloud, requiresOAuth: true, description: 'Google Drive' },
    { name: 'Google_Sheets', icon: Database, requiresOAuth: true, description: 'Google Sheets' },
    { name: 'Google_Docs', icon: FileText, requiresOAuth: true, description: 'Google Docs' },
    { name: 'Adobe', icon: Cloud, requiresApiKey: true, description: 'Adobe Creative Cloud' }
  ],
  'Communication': [
    { name: 'Gmail', icon: Mail, requiresOAuth: true, description: 'Gmail' },
    { name: 'Twilio', icon: MessageSquare, requiresApiKey: true, description: 'Twilio SMS/Voice' },
    { name: 'SendGrid', icon: Mail, requiresApiKey: true, description: 'SendGrid Email' }
  ],
  'Marketing & CRM': [
    { name: 'GoHighLevel', icon: Zap, requiresApiKey: true, description: 'GoHighLevel CRM' },
    { name: 'Facebook_Lead_Ads', icon: Zap, requiresOAuth: true, description: 'Facebook Lead Ads' }
  ],
  'Automation': [
    { name: 'Zapier', icon: Zap, requiresApiKey: true, description: 'Zapier Webhooks' },
    { name: 'Stripe', icon: Zap, requiresApiKey: true, description: 'Stripe Payments' },
    { name: 'DocuSign', icon: FileText, requiresOAuth: true, description: 'DocuSign eSignature' }
  ]
};

export default function AdminIntegrations() {
  const [selectedCategory, setSelectedCategory] = useState('AI Models');
  const [apiKeyInputs, setApiKeyInputs] = useState({});
  const [testingId, setTestingId] = useState(null);
  const [connectingId, setConnectingId] = useState(null);
  const queryClient = useQueryClient();
  const { orgId, isLoading: orgLoading } = useOrgId();

  // Check if user is admin
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = user?.role === 'admin';

  const { data: integrations = [], isLoading } = useQuery({
    queryKey: ['integrations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      return await base44.entities.IntegrationConfig.filter({ org_id: orgId });
    },
    enabled: !!orgId
  });

  const connectMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('connectIntegration', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
      setApiKeyInputs({});
      setConnectingId(null);
      toast.success(data.message || 'Integration connected successfully');
    },
    onError: (error) => {
      setConnectingId(null);
      const msg = error.response?.data?.error || error.message || 'Connection failed';
      toast.error(msg);
    }
  });

  const testMutation = useMutation({
    mutationFn: async (integrationName) => {
      const response = await base44.functions.invoke('testIntegration', { 
        integration_key: integrationName
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
      setTestingId(null);
      if (data.ok) {
        toast.success(data.message || 'Connection test successful');
      } else if (data.status === 'needs_reconnect') {
        toast.warning(data.message || 'Integration needs to be reconnected');
      } else {
        toast.error(data.message || 'Connection test failed');
      }
    },
    onError: (error) => {
      setTestingId(null);
      toast.error(error.response?.data?.error || 'Test failed');
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (integrationName) => {
      const response = await base44.functions.invoke('connectIntegration', {
        integration_key: integrationName,
        action: 'disconnect'
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
      toast.success(data.message || 'Integration disconnected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to disconnect');
    }
  });

  const handleConnect = (integrationName, requiresApiKey) => {
    if (requiresApiKey) {
      const apiKey = apiKeyInputs[integrationName];
      if (!apiKey) {
        toast.error('Please enter an API key');
        return;
      }
      setConnectingId(integrationName);
      connectMutation.mutate({ integration_name: integrationName, api_key: apiKey });
    } else {
      setConnectingId(integrationName);
      connectMutation.mutate({ integration_name: integrationName });
    }
  };

  const handleTest = (integrationName) => {
    setTestingId(integrationName);
    testMutation.mutate(integrationName);
  };

  // Show access denied for non-admins
  if (!orgLoading && user && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-slate-600">Only administrators can manage integrations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = Object.keys(INTEGRATION_CATEGORIES);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-slate-600">Connect your LoanGenius instance to external services</p>
      </div>

      {/* Use Cases Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Popular Use Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h3 className="font-semibold text-sm mb-1">📊 Import Leads to LoanGenius</h3>
              <p className="text-xs text-slate-600">Sync leads from Google Sheets directly into your pipeline</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h3 className="font-semibold text-sm mb-1">📝 Auto-Generate Documents</h3>
              <p className="text-xs text-slate-600">Create closing documents from deal data in Google Docs</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100">
              <h3 className="font-semibold text-sm mb-1">✉️ Email Notifications</h3>
              <p className="text-xs text-slate-600">Send deal updates via Gmail and receive confirmations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTEGRATION_CATEGORIES[category].map(integration => {
                const Icon = integration.icon;
                const config = integrations.find(i => i.integration_name === integration.name);
                const isConnected = config && ['connected', 'healthy'].includes(config.status);
                const needsReconnect = config?.status === 'needs_reconnect';
                const isUnhealthy = config?.status === 'unhealthy' || config?.status === 'error';

                const getStatusBadge = () => {
                  if (needsReconnect) {
                    return (
                      <Badge className="bg-amber-100 text-amber-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Needs Reconnect
                      </Badge>
                    );
                  }
                  if (isUnhealthy) {
                    return (
                      <Badge className="bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Unhealthy
                      </Badge>
                    );
                  }
                  if (config?.status === 'healthy') {
                    return (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    );
                  }
                  if (isConnected) {
                    return (
                      <Badge className="bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    );
                  }
                  return null;
                };

                return (
                  <Card key={integration.name}>
                    <CardHeader className="flex flex-row items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name.replace(/_/g, ' ')}</CardTitle>
                          <p className="text-xs text-slate-500 mt-1">{integration.description}</p>
                        </div>
                      </div>
                      {getStatusBadge()}
                    </CardHeader>

                    <CardContent>
                      {needsReconnect && (
                        <Alert className="mb-3 bg-amber-50 border-amber-200">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-amber-800 text-xs">
                            Authentication expired or invalid. Please reconnect.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {(isConnected || needsReconnect || isUnhealthy) && config ? (
                        <div className="space-y-3">
                          <div className="text-xs text-slate-500 space-y-1">
                            {config.account_email && (
                              <p>Account: {config.account_email}</p>
                            )}
                            {config.connected_at && (
                              <p>Connected: {new Date(config.connected_at).toLocaleDateString()}</p>
                            )}
                            {config.last_tested_at && (
                              <p>Last tested: {new Date(config.last_tested_at).toLocaleString()}</p>
                            )}
                            {config.last_error && (
                              <p className="text-red-600 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {config.last_error}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {needsReconnect ? (
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  // Clear any existing input and show input for reconnect
                                  setApiKeyInputs(prev => ({ ...prev, [integration.name]: '' }));
                                }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reconnect
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTest(integration.name)}
                                disabled={testingId === integration.name}
                              >
                                {testingId === integration.name ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Test
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => disconnectMutation.mutate(integration.name)}
                              disabled={disconnectMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                          
                          {/* Show reconnect input if needs_reconnect and user clicked Reconnect */}
                          {needsReconnect && apiKeyInputs[integration.name] !== undefined && integration.requiresApiKey && (
                            <div className="pt-2 border-t space-y-2">
                              <Input
                                type="password"
                                placeholder="Enter new API Key"
                                value={apiKeyInputs[integration.name] || ''}
                                onChange={(e) =>
                                  setApiKeyInputs(prev => ({
                                    ...prev,
                                    [integration.name]: e.target.value
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleConnect(integration.name, true)}
                                disabled={connectingId === integration.name || !apiKeyInputs[integration.name]}
                              >
                                {connectingId === integration.name ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                    Reconnecting...
                                  </>
                                ) : (
                                  'Save New Credentials'
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {integration.requiresApiKey && (
                            <Input
                              type="password"
                              placeholder="Enter API Key"
                              value={apiKeyInputs[integration.name] || ''}
                              onChange={(e) =>
                                setApiKeyInputs(prev => ({
                                  ...prev,
                                  [integration.name]: e.target.value
                                }))
                              }
                            />
                          )}
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleConnect(integration.name, integration.requiresApiKey)}
                            disabled={connectingId === integration.name || (integration.requiresApiKey && !apiKeyInputs[integration.name])}
                          >
                            {connectingId === integration.name ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Connecting...
                              </>
                            ) : (
                              <>
                                {integration.requiresApiKey ? 'Connect' : 'Authorize'}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}