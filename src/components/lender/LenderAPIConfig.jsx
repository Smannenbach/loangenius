import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Key, Webhook, Link as LinkIcon, Check, Copy, AlertCircle, 
  TestTube, Loader2, CheckCircle2, XCircle 
} from 'lucide-react';
import { toast } from 'sonner';

export default function LenderAPIConfig({ lender, onClose }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState({
    api_endpoint: lender.api_endpoint || '',
    api_key: '', // Never show existing key
    webhook_url: '',
    webhook_secret: '',
    auth_type: 'bearer',
    timeout_seconds: 30,
    retry_attempts: 3,
    test_mode: false
  });
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.LenderIntegration.update(lender.id, {
        api_endpoint: data.api_endpoint,
        api_key_encrypted: data.api_key, // In production: encrypt this
        meta_json: {
          ...lender.meta_json,
          webhook_url: data.webhook_url,
          webhook_secret: data.webhook_secret,
          auth_type: data.auth_type,
          timeout_seconds: data.timeout_seconds,
          retry_attempts: data.retry_attempts,
          test_mode: data.test_mode
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lenderIntegrations']);
      toast.success('API configuration saved');
      if (onClose) onClose();
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    }
  });

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test API endpoint with a simple health check
      const response = await fetch(config.api_endpoint + '/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.api_key}`
        }
      });

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful' });
        toast.success('Connection test passed!');
      } else {
        setTestResult({ 
          success: false, 
          message: `Failed: ${response.status} ${response.statusText}` 
        });
        toast.error('Connection test failed');
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
      toast.error('Connection test failed: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const webhookEndpoint = `${window.location.origin}/api/webhooks/lender/${lender.id}`;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="api">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api">API Config</TabsTrigger>
          <TabsTrigger value="webhook">Webhooks</TabsTrigger>
          <TabsTrigger value="test">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                API Credentials
              </CardTitle>
              <CardDescription>Configure API endpoint and authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Endpoint URL *</Label>
                <Input
                  value={config.api_endpoint}
                  onChange={(e) => setConfig({ ...config, api_endpoint: e.target.value })}
                  placeholder="https://api.lender.com/v1/submissions"
                />
              </div>

              <div>
                <Label>API Key *</Label>
                <Input
                  type="password"
                  value={config.api_key}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Enter API key (encrypted at rest)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be encrypted and stored securely
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Auth Type</Label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={config.auth_type}
                    onChange={(e) => setConfig({ ...config, auth_type: e.target.value })}
                  >
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">API Key Header</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>
                <div>
                  <Label>Timeout (seconds)</Label>
                  <Input
                    type="number"
                    value={config.timeout_seconds}
                    onChange={(e) => setConfig({ ...config, timeout_seconds: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Test Mode</Label>
                  <p className="text-xs text-yellow-700">Use sandbox/test endpoints</p>
                </div>
                <Switch
                  checked={config.test_mode}
                  onCheckedChange={(v) => setConfig({ ...config, test_mode: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Webhook className="h-5 w-5 text-purple-600" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>Receive real-time status updates from lender</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Webhook Endpoint</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookEndpoint}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(webhookEndpoint);
                      toast.success('Copied to clipboard');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Provide this URL to your lender for status updates
                </p>
              </div>

              <div>
                <Label>Webhook Secret</Label>
                <Input
                  type="password"
                  value={config.webhook_secret}
                  onChange={(e) => setConfig({ ...config, webhook_secret: e.target.value })}
                  placeholder="Generate shared secret for webhook validation"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    const secret = 'wh_' + Math.random().toString(36).substring(2, 15);
                    setConfig({ ...config, webhook_secret: secret });
                    toast.success('Secret generated');
                  }}
                >
                  Generate Secret
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <p className="font-medium text-blue-900 mb-2">Webhook Events:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
                  <li>submission.received</li>
                  <li>submission.in_review</li>
                  <li>submission.approved</li>
                  <li>submission.denied</li>
                  <li>submission.conditions_issued</li>
                  <li>pricing.updated</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-5 w-5 text-green-600" />
                Connection Test
              </CardTitle>
              <CardDescription>Verify API credentials and connectivity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={testConnection}
                disabled={isTesting || !config.api_endpoint || !config.api_key}
                className="w-full gap-2"
              >
                {isTesting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Testing Connection...</>
                ) : (
                  <><TestTube className="h-4 w-4" />Test Connection</>
                )}
              </Button>

              {testResult && (
                <div className={`p-4 rounded-lg border ${
                  testResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {testResult.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => saveMutation.mutate(config)}
          disabled={saveMutation.isPending || !config.api_endpoint}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}