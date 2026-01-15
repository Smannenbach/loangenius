import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, TestTube, Eye, EyeOff } from 'lucide-react';

export default function AdminIntegrationsPage() {
  const [showValues, setShowValues] = useState({});

  // TODO: Load actual integration status from backend
  const integrations = [
    {
      name: 'Twilio (SMS)',
      category: 'Communications',
      status: 'configured',
      secretKey: 'TWILIO_ACCOUNT_SID',
      maskedValue: 'AC••••••••••••••••5d',
      lastTested: '2026-01-15',
    },
    {
      name: 'SendGrid (Email)',
      category: 'Communications',
      status: 'configured',
      secretKey: 'SENDGRID_API_KEY',
      maskedValue: 'SG.••••••••••••••••••••',
      lastTested: '2026-01-15',
    },
    {
      name: 'DocuSign (E-Signatures)',
      category: 'E-Signatures',
      status: 'missing',
      secretKey: 'DOCUSIGN_INTEGRATION_KEY',
      maskedValue: null,
      lastTested: null,
    },
    {
      name: 'LeadConnector (CRM)',
      category: 'CRM',
      status: 'missing',
      secretKey: 'LEADCONNECTOR_API_KEY',
      maskedValue: null,
      lastTested: null,
    },
    {
      name: 'OpenAI (AI Services)',
      category: 'AI',
      status: 'configured',
      secretKey: 'OPENAI_API_KEY',
      maskedValue: 'sk-••••••••••••••••••••',
      lastTested: '2026-01-14',
    },
    {
      name: 'AWS S3 (File Storage)',
      category: 'Storage',
      status: 'configured',
      secretKey: 'STORAGE_ACCESS_KEY',
      maskedValue: 'AKIA••••••••••••••••••',
      lastTested: '2026-01-15',
    },
  ];

  const toggleShowValue = (key) => {
    setShowValues(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestConnection = (name) => {
    // TODO: Call backend to test connection
    alert(`Testing ${name}... (implement actual test)`);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin: Integrations</h1>
          <p className="text-gray-500 mt-2">Configure and manage external service integrations</p>
        </div>

        {/* Integration Cards */}
        <div className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.secretKey} className="border border-gray-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {integration.category}
                      </Badge>
                      {integration.status === 'configured' ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Missing
                        </Badge>
                      )}
                    </div>
                    {integration.lastTested && (
                      <p className="text-sm text-gray-500 mt-2">Last tested: {new Date(integration.lastTested).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              {integration.status === 'configured' && (
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">Secret Key</label>
                      <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <code className="text-sm font-mono text-gray-900 flex-1">
                          {showValues[integration.secretKey] ? integration.maskedValue : integration.maskedValue}
                        </code>
                        <button
                          onClick={() => toggleShowValue(integration.secretKey)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showValues[integration.secretKey] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Only last 4 characters visible for security</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestConnection(integration.name)}
                        className="gap-2"
                      >
                        <TestTube className="h-4 w-4" />
                        Test Connection
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
              {integration.status === 'missing' && (
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Set the environment variable to enable this integration:</p>
                  <code className="text-sm bg-gray-50 p-2 rounded block font-mono text-gray-900 mb-4">
                    {integration.secretKey}=your-secret-key
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => alert('Redirect to dashboard settings to add secret')}
                  >
                    Add Secret
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* Documentation */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>How to Add Integrations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>1. Go to App Settings → Environment Variables</p>
            <p>2. Add the secret key from your third-party service</p>
            <p>3. Refresh this page to see the updated status</p>
            <p>4. Test the connection to verify it works</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}