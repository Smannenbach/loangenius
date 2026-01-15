import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';

export default function BorrowerPortalLogin() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) {
        validateToken(token);
      }
    }
  }, []);

  const validateToken = async (token) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('portalMagicLink', {
        action: 'validateAndCreateSession',
        token,
      });

      if (response.data?.valid) {
        setStep('success');
        setTimeout(() => {
          window.location.href = `/BorrowerPortal?sessionId=${response.data.sessionId}`;
        }, 2000);
      } else {
        setError('Invalid or expired link. Please request a new one.');
        setStep('error');
      }
    } catch (err) {
      setError(err.message || 'Failed to validate link');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await base44.functions.invoke('portalLookupBorrower', {
        borrower_email: email,
      });

      if (response.data?.success) {
        setStep('success');
        setTimeout(() => {
          setEmail('');
          setStep('email');
        }, 5000);
      } else {
        setError('Email not found in system. Please contact your loan officer.');
        setStep('email');
      }
    } catch (err) {
      setError(err.message || 'Failed to send request');
      setStep('email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-slate-700">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <Lock className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Loan Portal</CardTitle>
          <p className="text-sm text-slate-500 mt-2">Secure access to your application</p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'email' && (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div className="text-center text-slate-600 text-sm">
                Enter your email to access your loan application status
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-11 pl-10 bg-slate-50 border-slate-200"
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Access Link
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Access Link Sent</p>
                <p className="text-sm text-slate-600 mt-2">
                  Check your email for a portal access link. It will expire in 24 hours.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4 py-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Access Error</p>
                <p className="text-sm text-slate-600 mt-2">{error}</p>
              </div>
              <Button
                onClick={() => {
                  setStep('email');
                  setEmail('');
                  setError('');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Try Again
              </Button>
            </div>
          )}

          <div className="text-center text-xs text-slate-500 border-t border-slate-200 pt-4">
            <p>Need help? Contact your loan officer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}