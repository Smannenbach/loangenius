import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenantSafe } from '@/components/useBranding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Zap, 
  Check, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Calendar,
  Users,
  Briefcase,
  Shield,
  BarChart3,
  Database,
  Mail,
  MessageSquare,
  FileText,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'For small teams getting started',
    features: ['3 user seats', '50 deals/month', 'Email support', 'Basic reports'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    description: 'For growing lending businesses',
    features: ['10 user seats', '200 deals/month', 'Priority support', 'Advanced analytics', 'API access'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    description: 'For large organizations',
    features: ['Unlimited users', 'Unlimited deals', 'Dedicated support', 'White-label branding', 'Custom integrations', 'SLA guarantee'],
  },
];

export default function AdminBilling() {
  const queryClient = useQueryClient();
  const { tenant_id } = useTenantSafe();
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenant_id],
    queryFn: async () => {
      if (!tenant_id) return null;
      const tenants = await base44.entities.TenantAccount.filter({ id: tenant_id });
      return tenants[0];
    },
    enabled: !!tenant_id,
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', tenant_id],
    queryFn: async () => {
      const res = await base44.functions.invoke('tenantBillingCheckout', {
        action: 'get_subscription',
        tenant_id,
      });
      return res.data?.subscription;
    },
    enabled: !!tenant_id,
  });

  const handleCheckout = async (planId) => {
    if (window.self !== window.top) {
      alert('Please open this page in a new tab to complete checkout');
      return;
    }
    
    setCheckoutLoading(planId);
    try {
      const res = await base44.functions.invoke('tenantBillingCheckout', {
        action: 'create_checkout',
        tenant_id,
        plan_id: planId,
        return_url: window.location.href,
      });
      
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      toast.error('Failed to start checkout: ' + error.message);
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await base44.functions.invoke('tenantBillingCheckout', {
        action: 'create_portal',
        tenant_id,
        return_url: window.location.href,
      });
      
      if (res.data?.portal_url) {
        window.location.href = res.data.portal_url;
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };

  const { data: usageLogs = [] } = useQuery({
    queryKey: ['usage-logs', tenant_id],
    queryFn: async () => {
      if (!tenant_id) return [];
      return base44.entities.TenantUsageLog.filter({ tenant_id });
    },
    enabled: !!tenant_id,
  });

  const currentPlan = PLANS.find(p => p.id === (subscription?.plan_id || tenant?.plan_id || 'starter'));

  // Calculate usage metrics from logs
  const usageMetrics = {
    api_calls: usageLogs.filter(l => l.metric_type === 'api_calls').reduce((s, l) => s + (l.metric_value || 0), 0),
    storage_bytes: usageLogs.filter(l => l.metric_type === 'storage_bytes').reduce((s, l) => s + (l.metric_value || 0), 0),
    ai_tokens: usageLogs.filter(l => l.metric_type === 'ai_tokens').reduce((s, l) => s + (l.metric_value || 0), 0),
    emails_sent: usageLogs.filter(l => l.metric_type === 'emails_sent').reduce((s, l) => s + (l.metric_value || 0), 0),
    sms_sent: usageLogs.filter(l => l.metric_type === 'sms_sent').reduce((s, l) => s + (l.metric_value || 0), 0),
    document_generations: usageLogs.filter(l => l.metric_type === 'document_generations').reduce((s, l) => s + (l.metric_value || 0), 0),
  };

  const planLimits = {
    starter: { api_calls: 10000, storage_gb: 5, ai_tokens: 100000, emails: 1000, sms: 100 },
    professional: { api_calls: 50000, storage_gb: 25, ai_tokens: 500000, emails: 5000, sms: 500 },
    enterprise: { api_calls: -1, storage_gb: -1, ai_tokens: -1, emails: -1, sms: -1 }, // unlimited
  };

  const limits = planLimits[currentPlan?.id || 'starter'];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          Billing & Subscription
        </h1>
        <p className="text-gray-500 mt-2">Manage your subscription plan and billing details</p>
      </div>

      <Tabs defaultValue="subscription">

        <TabsList className="mb-6">
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="usage">Usage & Metering</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-8">
      {/* Current Plan Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your active subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">{currentPlan?.name || 'Free Trial'}</h3>
                <Badge className={
                  subscription?.status === 'active' ? 'bg-green-100 text-green-800' :
                  subscription?.status === 'trialing' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {subscription?.status || tenant?.status || 'trial'}
                </Badge>
              </div>
              <p className="text-gray-600 mt-1">${currentPlan?.price || 0}/month</p>
              
              {subscription?.current_period_end && (
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
              
              {subscription?.trial_end && subscription.status === 'trialing' && (
                <p className="text-sm text-orange-600 mt-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Trial ends {new Date(subscription.trial_end).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {subscription && (
              <Button variant="outline" onClick={handleManageBilling} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">User Seats</p>
                <p className="text-xl font-bold">{tenant?.usage_limits_json?.seats_used || 1} / {tenant?.usage_limits_json?.max_users || 3}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Deals This Month</p>
                <p className="text-xl font-bold">-- / {tenant?.usage_limits_json?.max_deals || 50}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Features</p>
                <p className="text-xl font-bold">{currentPlan?.features?.length || 4} Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Selection */}
      <div>
        <h2 className="text-xl font-bold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrentPlan = plan.id === (subscription?.plan_id || tenant?.plan_id);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${isCurrentPlan ? 'bg-blue-50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.name}
                    {isCurrentPlan && <Badge variant="outline">Current</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-base font-normal text-gray-500">/month</span>
                  </div>
                  
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-500' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || checkoutLoading === plan.id}
                    onClick={() => handleCheckout(plan.id)}
                  >
                    {checkoutLoading === plan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Test Mode Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Mode:</strong> Use card number 4242 4242 4242 4242 with any future expiry date and CVC to test payments.
        </AlertDescription>
      </Alert>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-2">Usage This Billing Period</h2>
            <p className="text-gray-500 text-sm">Track your metered usage against plan limits</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* API Calls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">API Calls</p>
                    <p className="text-lg font-bold">
                      {usageMetrics.api_calls.toLocaleString()} 
                      {limits.api_calls > 0 && <span className="text-sm font-normal text-gray-500"> / {limits.api_calls.toLocaleString()}</span>}
                    </p>
                  </div>
                </div>
                {limits.api_calls > 0 && (
                  <Progress value={(usageMetrics.api_calls / limits.api_calls) * 100} className="h-2" />
                )}
              </CardContent>
            </Card>

            {/* Storage */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Database className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Storage</p>
                    <p className="text-lg font-bold">
                      {(usageMetrics.storage_bytes / (1024*1024*1024)).toFixed(2)} GB
                      {limits.storage_gb > 0 && <span className="text-sm font-normal text-gray-500"> / {limits.storage_gb} GB</span>}
                    </p>
                  </div>
                </div>
                {limits.storage_gb > 0 && (
                  <Progress value={(usageMetrics.storage_bytes / (limits.storage_gb * 1024*1024*1024)) * 100} className="h-2" />
                )}
              </CardContent>
            </Card>

            {/* AI Tokens */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Bot className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">AI Tokens</p>
                    <p className="text-lg font-bold">
                      {usageMetrics.ai_tokens.toLocaleString()}
                      {limits.ai_tokens > 0 && <span className="text-sm font-normal text-gray-500"> / {limits.ai_tokens.toLocaleString()}</span>}
                    </p>
                  </div>
                </div>
                {limits.ai_tokens > 0 && (
                  <Progress value={(usageMetrics.ai_tokens / limits.ai_tokens) * 100} className="h-2" />
                )}
              </CardContent>
            </Card>

            {/* Emails */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Mail className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Emails Sent</p>
                    <p className="text-lg font-bold">
                      {usageMetrics.emails_sent.toLocaleString()}
                      {limits.emails > 0 && <span className="text-sm font-normal text-gray-500"> / {limits.emails.toLocaleString()}</span>}
                    </p>
                  </div>
                </div>
                {limits.emails > 0 && (
                  <Progress value={(usageMetrics.emails_sent / limits.emails) * 100} className="h-2" />
                )}
              </CardContent>
            </Card>

            {/* SMS */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">SMS Sent</p>
                    <p className="text-lg font-bold">
                      {usageMetrics.sms_sent.toLocaleString()}
                      {limits.sms > 0 && <span className="text-sm font-normal text-gray-500"> / {limits.sms.toLocaleString()}</span>}
                    </p>
                  </div>
                </div>
                {limits.sms > 0 && (
                  <Progress value={(usageMetrics.sms_sent / limits.sms) * 100} className="h-2" />
                )}
              </CardContent>
            </Card>

            {/* Document Generations */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Documents Generated</p>
                    <p className="text-lg font-bold">{usageMetrics.document_generations.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overage Warning */}
          {usageLogs.some(l => l.quota_exceeded) && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Usage Alert:</strong> Some metrics have exceeded plan limits. Overage charges may apply.
              </AlertDescription>
            </Alert>
          )}

          {/* Usage History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Recent Usage Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No usage data recorded yet</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {usageLogs.slice(0, 20).map((log, i) => (
                    <div key={log.id || i} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{log.metric_type?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">
                          {log.period_start ? new Date(log.period_start).toLocaleDateString() : 'Current period'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{log.metric_value?.toLocaleString()}</p>
                        {log.quota_exceeded && (
                          <Badge className="bg-red-100 text-red-700 text-xs">Over limit</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}