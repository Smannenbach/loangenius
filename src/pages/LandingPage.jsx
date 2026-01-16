import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { createPageUrl } from '../utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddressAutocomplete from '@/components/AddressAutocomplete';
import TCPAConsent from '@/components/TCPAConsent';
import { EmailVerification, PhoneVerification } from '@/components/OTPVerification';
import { toast } from 'sonner';
import {
  Building2,
  DollarSign,
  Home,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Loader2,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    home_email: '',
    mobile_phone: '',
    email_verified: false,
    phone_verified: false,
    property_street: '',
    property_city: '',
    property_state: '',
    property_zip: '',
    property_county: '',
    property_type: '',
    loan_amount: '',
    loan_purpose: 'Purchase',
    tcpa_consent: false,
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.tcpa_consent) {
        throw new Error('TCPA consent is required');
      }
      
      // Create lead
      const lead = await base44.entities.Lead.create({
        org_id: 'public',
        first_name: data.first_name,
        last_name: data.last_name,
        home_email: data.home_email,
        mobile_phone: data.mobile_phone,
        home_email_verified: data.email_verified,
        mobile_phone_verified: data.phone_verified,
        property_street: data.property_street,
        property_city: data.property_city,
        property_state: data.property_state,
        property_zip: data.property_zip,
        property_county: data.property_county,
        property_type: data.property_type,
        loan_amount: parseFloat(data.loan_amount) || null,
        loan_purpose: data.loan_purpose,
        status: 'new',
        source: 'website',
        tcpa_consent: data.tcpa_consent,
        tcpa_consent_date: new Date().toISOString(),
        tcpa_consent_ip: 'client', // Would be set server-side in production
      });

      return lead;
    },
    onSuccess: () => {
      toast.success('Application started! A loan officer will contact you shortly.');
      setStep(4); // Success screen
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.home_email || !formData.mobile_phone) {
        toast.error('Please complete all required fields');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.property_street || !formData.loan_amount) {
        toast.error('Property address and loan amount are required');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      submitMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">LoanGenius</span>
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => base44.auth.redirectToLogin()}>
            Sign In
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {step < 4 ? (
          <>
            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3].map((s) => (
                  <React.Fragment key={s}>
                    <div className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-white/20'}`} />
                  </React.Fragment>
                ))}
              </div>
              <p className="text-white/70 text-sm">Step {step} of 3</p>
            </div>

            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {step === 1 && 'Let\'s Get Started'}
                {step === 2 && 'Tell Us About the Property'}
                {step === 3 && 'Review & Submit'}
              </h1>
              <p className="text-xl text-white/80">
                {step === 1 && 'We need a few details to begin your loan application'}
                {step === 2 && 'Help us understand your financing needs'}
                {step === 3 && 'Confirm your information and we\'ll be in touch'}
              </p>
            </div>

            {/* Form Card */}
            <Card className="bg-white shadow-2xl">
              <CardContent className="p-8 space-y-6">
                {/* Step 1: Contact Info */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>First Name *</Label>
                        <Input
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name *</Label>
                        <Input
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          placeholder="Smith"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Email Address *</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={formData.home_email}
                          onChange={(e) => setFormData({ ...formData, home_email: e.target.value, email_verified: false })}
                          placeholder="john@example.com"
                          className="flex-1"
                        />
                        <EmailVerification
                          email={formData.home_email}
                          isVerified={formData.email_verified}
                          onVerified={() => setFormData({ ...formData, email_verified: true })}
                          showBadge={false}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Mobile Phone *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.mobile_phone}
                          onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value, phone_verified: false })}
                          placeholder="(555) 555-5555"
                          className="flex-1"
                        />
                        <PhoneVerification
                          phone={formData.mobile_phone}
                          isVerified={formData.phone_verified}
                          onVerified={() => setFormData({ ...formData, phone_verified: true })}
                          showBadge={false}
                        />
                      </div>
                    </div>

                    {(formData.email_verified || formData.phone_verified) && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        Contact {formData.email_verified && formData.phone_verified ? 'methods' : 'method'} verified
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: Property & Loan */}
                {step === 2 && (
                  <>
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Property Address *
                      </Label>
                      <AddressAutocomplete
                        value={formData.property_street}
                        onChange={(val) => setFormData({ ...formData, property_street: val })}
                        onAddressParsed={(parsed) => {
                          setFormData({
                            ...formData,
                            property_street: parsed.street,
                            property_city: parsed.city,
                            property_state: parsed.state,
                            property_zip: parsed.zip,
                            property_county: parsed.county,
                          });
                        }}
                        placeholder="Start typing the property address..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input value={formData.property_city} onChange={(e) => setFormData({ ...formData, property_city: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={formData.property_state} onChange={(e) => setFormData({ ...formData, property_state: e.target.value })} maxLength={2} placeholder="CA" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Property Type</Label>
                      <Select value={formData.property_type} onValueChange={(v) => setFormData({ ...formData, property_type: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SFR">Single Family</SelectItem>
                          <SelectItem value="Multi-Family">Multi-Family (2-4 units)</SelectItem>
                          <SelectItem value="Condo">Condo</SelectItem>
                          <SelectItem value="Townhouse">Townhouse</SelectItem>
                          <SelectItem value="Commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        Loan Amount Needed *
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          type="number"
                          className="pl-8"
                          value={formData.loan_amount}
                          onChange={(e) => setFormData({ ...formData, loan_amount: e.target.value })}
                          placeholder="500,000"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Loan Purpose</Label>
                      <Select value={formData.loan_purpose} onValueChange={(v) => setFormData({ ...formData, loan_purpose: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Purchase">Purchase</SelectItem>
                          <SelectItem value="Refinance">Refinance</SelectItem>
                          <SelectItem value="Cash-Out">Cash-Out Refinance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Step 3: TCPA & Review */}
                {step === 3 && (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Review Your Information</h3>
                      
                      <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium">{formData.first_name} {formData.last_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Email:</span>
                          <span className="font-medium">{formData.home_email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phone:</span>
                          <span className="font-medium">{formData.mobile_phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Property:</span>
                          <span className="font-medium">{formData.property_city}, {formData.property_state}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Loan Amount:</span>
                          <span className="font-medium text-green-600">${parseFloat(formData.loan_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <TCPAConsent
                      checked={formData.tcpa_consent}
                      onCheckedChange={(checked) => setFormData({ ...formData, tcpa_consent: checked })}
                      error={false}
                    />
                  </>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-4">
                  {step > 1 && step < 4 && (
                    <Button
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    onClick={handleNext}
                    disabled={submitMutation.isPending || (step === 3 && !formData.tcpa_consent)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : step === 3 ? (
                      <>
                        Submit Application
                        <CheckCircle className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Success Screen */
          <Card className="bg-white shadow-2xl text-center">
            <CardContent className="p-12">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
              <p className="text-gray-600 mb-8">
                Thank you for your interest. A loan officer will review your information and contact you within 24 hours.
              </p>
              <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trust Badges */}
        {step < 4 && (
          <div className="mt-8 flex items-center justify-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Secure Application</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>No Impact to Credit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Quick Approval</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}