import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  Mail,
  MessageSquare,
  Cloud,
  Brain,
  Database,
  FileText,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Trash2
} from 'lucide-react';

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
  const queryClient = useQueryClient();

  const { data: integrations = [] } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => base44.entities.IntegrationConfig.filter({})
  });

  const connectMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.functions.invoke('connectIntegration', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setApiKeyInputs({});
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (integrationId) => {
      return await base44.entities.IntegrationConfig.delete(integrationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    }
  });

  const handleConnect = (integrationName, requiresApiKey) => {
    if (requiresApiKey) {
      const apiKey = apiKeyInputs[integrationName];
      if (!apiKey) {
        alert('Please enter API key');
        return;
      }
      connectMutation.mutate({ integration_name: integrationName, api_key: apiKey });
    } else {
      // OAuth flow would trigger here
      connectMutation.mutate({ integration_name: integrationName });
    }
  };

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
                const connected = integrations.some(
                  i => i.integration_name === integration.name && i.status === 'connected'
                );
                const config = integrations.find(i => i.integration_name === integration.name);

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
                      {connected && (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </CardHeader>

                    <CardContent>
                      {connected ? (
                        <div className="space-y-3">
                          {config?.last_tested_at && (
                            <p className="text-xs text-slate-500">
                              Last tested: {new Date(config.last_tested_at).toLocaleString()}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Test connection
                              }}
                            >
                              Test
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => disconnectMutation.mutate(config.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Disconnect
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {integration.requiresApiKey && (
                            <Input
                              type="password"
                              placeholder="API Key"
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
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleConnect(integration.name, integration.requiresApiKey)}
                            disabled={connectMutation.isPending}
                          >
                            {integration.requiresApiKey ? 'Connect' : 'Authorize'}
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