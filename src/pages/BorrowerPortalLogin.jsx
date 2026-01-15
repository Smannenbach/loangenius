import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, Loader2, Building2, Lock } from 'lucide-react';

export default function BorrowerPortalLogin() {
  const [step, setStep] = useState('email'); // email or verify
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionData, setSessionData] = useState(null);

  // Check if we have token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      validateTokenDirectly(urlToken);
    }
  }, []);

  const validateTokenDirectly = async (tokenValue) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('portalAuth', {
        action: 'validateToken',
        token: tokenValue,
      });

      if (response.data?.valid) {
        setSessionData(response.data);
        // Redirect to portal
        window.location.href = `/BorrowerPortal?sessionId=${response.data.sessionId}`;
      } else {
        setError('Invalid or expired link');
      }
    } catch (err) {
      setError(err.message || 'Failed to validate token');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) {
        setError('Please enter your email');
        return;
      }

      // In production, this would verify the borrower exists and send magic link
      // For now, simulate the process
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600 mb-4">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LoanGenius</h1>
          <p className="text-gray-600 mt-1">Borrower Portal</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">Access Your Application</CardTitle>
            <p className="text-sm text-gray-600 text-center mt-2">
              We'll send you a secure link to view your loan application
            </p>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
                <p className="text-center text-sm text-gray-600">
                  {step === 'email' ? 'Sending magic link...' : 'Verifying your access...'}
                </p>
              </div>
            ) : error ? (
              <div className="space-y-4">
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setError('');
                    setStep('email');
                    setEmail('');
                    setToken('');
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="mb-2 block">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the email associated with your loan application
                  </p>
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 h-10 gap-2">
                  Send Magic Link
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mx-auto">
                  <Lock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Check your email</p>
                  <p className="text-sm text-gray-600 mt-1">
                    We've sent a secure link to <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    The link will expire in 7 days. Don't share it with anyone.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep('email')}
                >
                  Use Different Email
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          Questions? Contact your loan officer for support.
        </p>
      </div>
    </div>
  );
}