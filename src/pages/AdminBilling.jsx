import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenantSafe } from '@/components/useBranding';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

  const currentPlan = PLANS.find(p => p.id === (subscription?.plan_id || tenant?.plan_id || 'starter'));

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-blue-600" />
          Billing & Subscription
        </h1>
        <p className="text-gray-500 mt-2">Manage your subscription plan and billing details</p>
      </div>

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
    </div>
  );
}