import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOrgId } from '@/components/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function BillingSuccess() {
  const navigate = useNavigate();
  const { orgId, isReady } = useOrgId();
  const [countdown, setCountdown] = useState(5);

  // Poll for billing status
  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing', orgId],
    queryFn: async () => {
      const accounts = await base44.entities.BillingAccount.filter({ org_id: orgId });
      return accounts.length > 0 ? accounts[0] : null;
    },
    enabled: isReady && !!orgId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  const isActive = billing?.status === 'active' || billing?.status === 'trialing';

  useEffect(() => {
    if (isActive && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (isActive && countdown === 0) {
      navigate(createPageUrl('Dashboard'));
    }
  }, [isActive, countdown, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            {isActive ? (
              <CheckCircle className="h-12 w-12 text-green-600" />
            ) : (
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            )}
          </div>
          <CardTitle className="text-3xl">
            {isActive ? 'Payment Successful!' : 'Processing Payment...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {isLoading || !isActive ? (
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                Please wait while we activate your subscription...
              </p>
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Syncing with Stripe</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xl text-gray-900">
                Your <strong className="text-blue-600">{billing.plan_name}</strong> plan is now active!
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-900">✅ All premium features unlocked</p>
                <p className="text-green-900">✅ Billing configured</p>
                <p className="text-green-900">✅ Ready to use</p>
              </div>
              <p className="text-gray-600">
                Redirecting to dashboard in <strong>{countdown}</strong> seconds...
              </p>
              <Button
                onClick={() => navigate(createPageUrl('Dashboard'))}
                className="bg-blue-600 hover:bg-blue-500"
              >
                Go to Dashboard Now
              </Button>
            </div>
          )}

          <div className="pt-6 border-t text-sm text-gray-500">
            <p>Need help? Contact support at support@loangenius.com</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}