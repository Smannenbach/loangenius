import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function BorrowerPortalLogin() {
  const [step, setStep] = useState('email'); // email, validate, error, success
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);

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
        setSessionId(response.data.sessionId);
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
      // Public endpoint: borrow looks up by email, notifies LO
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">LG</span>
            </div>
          </div>
          <CardTitle>Loan Application Portal</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'email' && (
            <form onSubmit={handleRequestLink} className="space-y-4">
              <div className="text-center text-gray-600 text-sm mb-4">
                Enter your email to request access to your loan portal
              </div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10"
              />
              {error && (
                <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Request Access <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Request Sent!</p>
                <p className="text-sm text-gray-600 mt-2">
                  Your loan officer will send you a portal access link via email shortly.
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Access Error</p>
                <p className="text-sm text-gray-600 mt-2">{error}</p>
              </div>
              <Button
                onClick={() => {
                  setStep('email');
                  setEmail('');
                  setError('');
                }}
                className="w-full"
              >
                Request New Link
              </Button>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <p>Questions? Contact your loan officer</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}