import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Database, 
  Key, 
  Zap, 
  RefreshCw,
  Server,
  Shield,
  Mail,
  MessageSquare
} from 'lucide-react';

export default function SystemHealth() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: healthData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const checks = [];
      
      // 1. Database - check if we can read entities
      try {
        const leads = await base44.entities.Lead.list('-created_date', 1);
        checks.push({ 
          name: 'Database (Leads)', 
          status: 'healthy', 
          message: 'Connection successful',
          icon: Database
        });
      } catch (e) {
        checks.push({ 
          name: 'Database (Leads)', 
          status: 'error', 
          message: e.message,
          icon: Database
        });
      }

      try {
        const deals = await base44.entities.Deal.list('-created_date', 1);
        checks.push({ 
          name: 'Database (Deals)', 
          status: 'healthy', 
          message: 'Connection successful',
          icon: Database
        });
      } catch (e) {
        checks.push({ 
          name: 'Database (Deals)', 
          status: 'error', 
          message: e.message,
          icon: Database
        });
      }

      // 2. Check integrations config
      try {
        const integrations = await base44.entities.IntegrationConfig.list();
        const connected = integrations.filter(i => i.status === 'connected');
        checks.push({ 
          name: 'Integrations Config', 
          status: connected.length > 0 ? 'healthy' : 'warning', 
          message: `${connected.length}/${integrations.length} connected`,
          icon: Zap
        });
      } catch (e) {
        checks.push({ 
          name: 'Integrations Config', 
          status: 'warning', 
          message: 'Could not check integrations',
          icon: Zap
        });
      }

      // 3. Check AI providers
      try {
        const providers = await base44.entities.AIProvider.list();
        const active = providers.filter(p => p.status === 'CONNECTED');
        checks.push({ 
          name: 'AI Providers', 
          status: active.length > 0 ? 'healthy' : 'warning', 
          message: `${active.length} active provider(s)`,
          icon: Zap
        });
      } catch (e) {
        checks.push({ 
          name: 'AI Providers', 
          status: 'warning', 
          message: 'Could not check AI providers',
          icon: Zap
        });
      }

      // 4. Check org membership
      try {
        if (user?.email) {
          const memberships = await base44.entities.OrgMembership.filter({ user_id: user.email });
          checks.push({ 
            name: 'Organization', 
            status: memberships.length > 0 ? 'healthy' : 'warning', 
            message: memberships.length > 0 ? `Member of ${memberships[0].org_id}` : 'No org membership',
            icon: Shield
          });
        }
      } catch (e) {
        checks.push({ 
          name: 'Organization', 
          status: 'warning', 
          message: 'Could not check org',
          icon: Shield
        });
      }

      // 5. Backend function check
      try {
        await base44.functions.invoke('testSystemHealth', {});
        checks.push({ 
          name: 'Backend Functions', 
          status: 'healthy', 
          message: 'Functions responding',
          icon: Server
        });
      } catch (e) {
        // Function might not exist, that's ok
        checks.push({ 
          name: 'Backend Functions', 
          status: 'warning', 
          message: 'testSystemHealth not configured',
          icon: Server
        });
      }

      return checks;
    },
    staleTime: 30000,
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-700">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700">Error</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>;
    }
  };

  const overallStatus = healthData?.every(c => c.status === 'healthy') 
    ? 'healthy' 
    : healthData?.some(c => c.status === 'error') 
      ? 'error' 
      : 'warning';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Server className="h-7 w-7 text-blue-600" />
            System Health
          </h1>
          <p className="text-gray-500 mt-1">Monitor system status and integrations</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`mb-6 ${
        overallStatus === 'healthy' ? 'border-green-200 bg-green-50' :
        overallStatus === 'error' ? 'border-red-200 bg-red-50' :
        'border-yellow-200 bg-yellow-50'
      }`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            {overallStatus === 'healthy' ? (
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            ) : overallStatus === 'error' ? (
              <XCircle className="h-12 w-12 text-red-600" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-yellow-600" />
            )}
            <div>
              <h2 className="text-xl font-bold">
                {overallStatus === 'healthy' ? 'All Systems Operational' :
                 overallStatus === 'error' ? 'System Issues Detected' :
                 'Some Warnings'}
              </h2>
              <p className="text-gray-600">
                Last checked: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Checks */}
      <Card>
        <CardHeader>
          <CardTitle>Health Checks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              Running health checks...
            </div>
          ) : (
            <div className="space-y-3">
              {healthData?.map((check, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <p className="text-sm text-gray-500">{check.message}</p>
                    </div>
                  </div>
                  {getStatusBadge(check.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Secrets Checklist */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Required Secrets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            These secrets should be configured in Dashboard → Settings → Environment Variables
          </p>
          <div className="space-y-2">
            {[
              { name: 'INTEGRATION_ENCRYPTION_KEY', desc: 'Required for secure credential storage', required: true },
              { name: 'OpenAI_API_Key', desc: 'For AI features', required: false },
              { name: 'Anthropic_API_Key', desc: 'Alternative AI provider', required: false },
              { name: 'Sendgrid_API_Key', desc: 'For email notifications', required: false },
              { name: 'TWILIO_ACCOUNT_SID', desc: 'For SMS notifications', required: false },
              { name: 'Google OAuth credentials', desc: 'For Google Sheets integration', required: false },
            ].map((secret, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                <div className={`h-2 w-2 rounded-full ${secret.required ? 'bg-red-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <p className="font-mono text-sm">{secret.name}</p>
                  <p className="text-xs text-gray-500">{secret.desc}</p>
                </div>
                {secret.required && (
                  <Badge variant="outline" className="text-red-600 border-red-200">Required</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}