import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, ArrowRight, CheckCircle, TrendingUp, Shield, 
  Zap, Users, Clock, Award, Mail, Phone, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { EmailVerification, PhoneVerification } from '@/components/OTPVerification';
import TCPAConsent from '@/components/TCPAConsent';

export default function LandingPage() {
  const [leadData, setLeadData] = useState({
    first_name: '',
    last_name: '',
    home_email: '',
    mobile_phone: '',
    property_street: '',
    property_city: '',
    property_state: '',
    property_zip: '',
    property_county: '',
    loan_amount: '',
    loan_type: 'DSCR',
    loan_purpose: 'Purchase',
    tcpa_consent: false,
    email_verified: false,
    phone_verified: false,
  });

  const [showForm, setShowForm] = useState(false);

  const submitLeadMutation = useMutation({
    mutationFn: async (data) => {
      if (!data.tcpa_consent) {
        throw new Error('TCPA consent is required');
      }

      return await base44.entities.Lead.create({
        org_id: 'default',
        first_name: data.first_name,
        last_name: data.last_name,
        home_email: data.home_email,
        home_email_verified: data.email_verified,
        mobile_phone: data.mobile_phone,
        mobile_phone_verified: data.phone_verified,
        property_street: data.property_street,
        property_city: data.property_city,
        property_state: data.property_state,
        property_zip: data.property_zip,
        property_county: data.property_county,
        loan_amount: data.loan_amount ? parseFloat(data.loan_amount) : null,
        loan_type: data.loan_type,
        loan_purpose: data.loan_purpose,
        status: 'new',
        source: 'website',
      });
    },
    onSuccess: () => {
      toast.success('Application submitted! We\'ll contact you shortly.');
      setLeadData({
        first_name: '', last_name: '', home_email: '', mobile_phone: '',
        property_street: '', property_city: '', property_state: '', property_zip: '', property_county: '',
        loan_amount: '', loan_type: 'DSCR', loan_purpose: 'Purchase',
        tcpa_consent: false, email_verified: false, phone_verified: false,
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast.error('Error submitting application: ' + error.message);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <Building2 className="h-16 w-16 text-blue-400" />
              <h1 className="text-6xl font-black text-white">LoanGenius</h1>
            </div>
            <p className="text-2xl text-blue-100 font-light mb-4">
              DSCR Loans Made Simple
            </p>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
              Fast approvals, competitive rates, and expert guidance for real estate investors.
            </p>
            <Button 
              size="lg" 
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-6 text-lg h-auto gap-2"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
              <Clock className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Fast Closings</h3>
              <p className="text-slate-300">Close in as little as 14 days with streamlined processing</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
              <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Competitive Rates</h3>
              <p className="text-slate-300">Flexible DSCR loans from 0.75 ratio with up to 80% LTV</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
              <Award className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Expert Support</h3>
              <p className="text-slate-300">Dedicated loan officers guiding you every step</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Capture Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader className="border-b">
              <CardTitle className="text-2xl">Start Your Application</CardTitle>
              <p className="text-gray-500">Get pre-qualified in minutes</p>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input 
                    value={leadData.first_name}
                    onChange={(e) => setLeadData({ ...leadData, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input 
                    value={leadData.last_name}
                    onChange={(e) => setLeadData({ ...leadData, last_name: e.target.value })}
                    placeholder="Smith"
                  />
                </div>
              </div>

              {/* Contact with OTP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="email"
                      value={leadData.home_email}
                      onChange={(e) => setLeadData({ ...leadData, home_email: e.target.value, email_verified: false })}
                      placeholder="john@example.com"
                      className="flex-1"
                    />
                    <EmailVerification
                      email={leadData.home_email}
                      isVerified={leadData.email_verified}
                      onVerified={() => setLeadData({ ...leadData, email_verified: true })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={leadData.mobile_phone}
                      onChange={(e) => setLeadData({ ...leadData, mobile_phone: e.target.value, phone_verified: false })}
                      placeholder="(555) 555-5555"
                      className="flex-1"
                    />
                    <PhoneVerification
                      phone={leadData.mobile_phone}
                      isVerified={leadData.phone_verified}
                      onVerified={() => setLeadData({ ...leadData, phone_verified: true })}
                    />
                  </div>
                </div>
              </div>

              {/* Property Address with Autocomplete */}
              <div className="space-y-2">
                <AddressAutocomplete
                  label="Property Address *"
                  value={leadData.property_street}
                  onChange={(val) => setLeadData({ ...leadData, property_street: val })}
                  onAddressParsed={(parsed) => {
                    setLeadData({
                      ...leadData,
                      property_street: parsed.street,
                      property_city: parsed.city,
                      property_state: parsed.state,
                      property_zip: parsed.zip,
                      property_county: parsed.county,
                    });
                  }}
                  placeholder="Start typing property address..."
                />
              </div>

              {/* Loan Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Desired Loan Amount</Label>
                  <Input 
                    type="number"
                    value={leadData.loan_amount}
                    onChange={(e) => setLeadData({ ...leadData, loan_amount: e.target.value })}
                    placeholder="500000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Loan Purpose</Label>
                  <select 
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={leadData.loan_purpose}
                    onChange={(e) => setLeadData({ ...leadData, loan_purpose: e.target.value })}
                  >
                    <option value="Purchase">Purchase</option>
                    <option value="Refinance">Refinance</option>
                    <option value="Cash-Out">Cash-Out Refinance</option>
                  </select>
                </div>
              </div>

              {/* TCPA Consent */}
              <div className="pt-4 border-t">
                <TCPAConsent
                  checked={leadData.tcpa_consent}
                  onCheckedChange={(checked) => setLeadData({ ...leadData, tcpa_consent: checked })}
                  error={false}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => submitLeadMutation.mutate(leadData)}
                  disabled={submitLeadMutation.isPending || !leadData.tcpa_consent || !leadData.first_name || !leadData.last_name || !leadData.home_email}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {submitLeadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Why Choose Us */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Why Choose LoanGenius?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Income Verification</h3>
              <p className="text-gray-600 text-sm">Qualify based on property cash flow, not W-2s</p>
            </div>
            <div className="text-center">
              <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Fast Approvals</h3>
              <p className="text-gray-600 text-sm">Pre-approval in 24 hours or less</p>
            </div>
            <div className="text-center">
              <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Flexible Terms</h3>
              <p className="text-gray-600 text-sm">DSCR as low as 0.75, up to 80% LTV</p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Expert Team</h3>
              <p className="text-gray-600 text-sm">Dedicated support throughout the process</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 text-lg mb-8">
            Join thousands of investors who trust LoanGenius for their DSCR loans
          </p>
          <Button 
            size="lg"
            onClick={() => setShowForm(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 px-10 py-6 text-lg h-auto gap-2"
          >
            Apply Now
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold text-white">LoanGenius</span>
              </div>
              <p className="text-sm text-slate-400">Your trusted partner for DSCR and investment property loans.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-blue-400">About Us</a></li>
                <li><a href="#" className="hover:text-blue-400">Loan Programs</a></li>
                <li><a href="#" className="hover:text-blue-400">Contact</a></li>
                <li><a href="#" className="hover:text-blue-400">Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Contact Us</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>(800) 555-LOAN</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>info@loangenius.com</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-500">
            <p>© 2026 LoanGenius. All rights reserved. NMLS #123456</p>
          </div>
        </div>
      </div>
    </div>
  );
}