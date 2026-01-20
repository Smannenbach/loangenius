import React from 'react';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Zap, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingSettings() {
  const { orgId, isReady } = useOrgId();
  const queryClient = useQueryClient();

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing', orgId],
    queryFn: async () => {
      const accounts = await base44.entities.BillingAccount.filter({ org_id: orgId });
      return accounts.length > 0 ? accounts[0] : null;
    },
    enabled: isReady && !!orgId,
  });

  const { data: entitlements = [] } = useQuery({
    queryKey: ['entitlements', orgId],
    queryFn: async () => {
      const ents = await base44.entities.Entitlement.filter({ org_id: orgId, is_active: true });
      return ents;
    },
    enabled: isReady && !!orgId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ plan, interval }) => {
      const response = await base44.functions.invoke('createCheckoutSession', { plan, interval });
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.checkout_url;
    },
    onError: (error) => {
      toast.error('Failed to start checkout: ' + error.message);
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createPortalSession', {});
      return response.data;
    },
    onSuccess: (data) => {
      window.location.href = data.portal_url;
    },
    onError: (error) => {
      toast.error('Failed to open portal: ' + error.message);
    },
  });

  const plans = [
    {
      name: 'Starter',
      key: 'starter',
      price: { monthly: 99, annual: 990 },
      description: 'Perfect for small teams',
      features: ['3 users', '100 leads/month', '10 deals/month', '5GB storage', 'Email support'],
    },
    {
      name: 'Professional',
      key: 'professional',
      price: { monthly: 299, annual: 2990 },
      description: 'For growing teams',
      features: ['10 users', '1,000 leads/month', '100 deals/month', '50GB storage', 'Google Sheets import', 'Borrower portal', 'Advanced analytics', 'Priority support'],
      popular: true,
    },
    {
      name: 'Enterprise',
      key: 'enterprise',
      price: { monthly: 'Custom', annual: 'Custom' },
      description: 'For large organizations',
      features: ['Unlimited users', 'Unlimited leads', 'Unlimited deals', 'Unlimited storage', 'Custom branding', 'White-label', 'API access', 'Dedicated support'],
    },
  ];

  const currentPlan = billing?.plan_name || 'none';

  if (isLoading || !isReady) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your plan and payment settings</p>
      </div>

      {billing && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold capitalize">{billing.plan_name || 'Trial'}</h3>
                  <Badge className={
                    billing.status === 'active' ? 'bg-green-100 text-green-800' :
                    billing.status === 'trialing' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {billing.status}
                  </Badge>
                </div>
                {billing.trial_ends_at && (
                  <p className="text-sm text-gray-600">
                    Trial ends: {new Date(billing.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
                {billing.current_period_end && (
                  <p className="text-sm text-gray-600">
                    Next billing: {new Date(billing.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => portalMutation.mutate()}
                disabled={!billing.stripe_customer_id || portalMutation.isPending}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Plans</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.key} className={plan.popular ? 'border-blue-500 border-2 relative' : ''}>
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="text-sm text-gray-600">{plan.description}</p>
              <div className="mt-4">
                {typeof plan.price.monthly === 'number' ? (
                  <>
                    <div className="text-3xl font-bold text-gray-900">
                      ${plan.price.monthly}
                      <span className="text-lg text-gray-500">/mo</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      or ${plan.price.annual}/year (save 2 months)
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-gray-900">{plan.price.monthly}</div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.key === currentPlan ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : plan.key === 'enterprise' ? (
                <Button variant="outline" className="w-full">
                  Contact Sales
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500"
                    onClick={() => checkoutMutation.mutate({ plan: plan.key, interval: 'monthly' })}
                    disabled={checkoutMutation.isPending}
                  >
                    Get {plan.name} - Monthly
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => checkoutMutation.mutate({ plan: plan.key, interval: 'annual' })}
                    disabled={checkoutMutation.isPending}
                  >
                    Get {plan.name} - Annual (Save 17%)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}