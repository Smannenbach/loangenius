import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Mail, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PrivacyRequest() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    request_type: '',
    jurisdiction: 'CPRA',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('submitPrivacyRequest', data);
      return response.data;
    },
    onSuccess: (data) => {
      setRequestId(data.request_id);
      setSubmitted(true);
      toast.success('Privacy request submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit request: ' + error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.request_type) {
      toast.error('Please fill in all required fields');
      return;
    }
    submitMutation.mutate(formData);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Request Received</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Your privacy request has been received and will be processed within the legally required timeframe.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-900">Request ID</p>
              <p className="text-2xl font-mono text-blue-600">{requestId}</p>
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>✅ Confirmation email sent to <strong>{formData.email}</strong></p>
              <p>⏱️ Expected response: Within {formData.jurisdiction === 'CPRA' ? '45 days' : '1 month'}</p>
              <p>📧 Questions? Reply to the confirmation email with your Request ID</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Request</h1>
          <p className="text-lg text-gray-600">Exercise your privacy rights under GDPR, CCPA, and CPRA</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit a Privacy Request</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              You have the right to access, delete, or correct your personal data. We will respond within the legally required timeframe.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone Number (Optional)</Label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jurisdiction <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.jurisdiction}
                    onValueChange={(v) => setFormData({ ...formData, jurisdiction: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GDPR">GDPR (EU)</SelectItem>
                      <SelectItem value="UK_GDPR">UK GDPR</SelectItem>
                      <SelectItem value="CCPA">CCPA (California)</SelectItem>
                      <SelectItem value="CPRA">CPRA (California)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Request Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(v) => setFormData({ ...formData, request_type: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="access">📄 Access / Export My Data</SelectItem>
                    <SelectItem value="delete">🗑️ Delete My Data</SelectItem>
                    <SelectItem value="correct">✏️ Correct My Data</SelectItem>
                    <SelectItem value="opt_out">🚫 Opt-Out of Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Additional Details (Optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Please provide any additional context for your request..."
                  rows={4}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                <p className="font-semibold mb-2">What happens next?</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>We will verify your identity to protect your data</li>
                  <li>You will receive a confirmation email with a Request ID</li>
                  <li>We will respond within {formData.jurisdiction === 'CPRA' ? '45 days' : '1 month'}</li>
                  <li>You can contact us anytime using your Request ID</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-500 h-12 text-lg"
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit Privacy Request'}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t">
              <p className="text-sm text-gray-600 text-center">
                <strong>Prefer email?</strong> Send your request to{' '}
                <a href="mailto:privacy@loangenius.com" className="text-blue-600 hover:underline">
                  privacy@loangenius.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This form complies with GDPR, UK GDPR, CCPA, and CPRA requirements.</p>
          <p>For questions, contact us at privacy@loangenius.com</p>
        </div>
      </div>
    </div>
  );
}