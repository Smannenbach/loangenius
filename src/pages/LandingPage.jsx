import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Zap,
  Brain,
  Shield,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileText,
  MessageSquare,
  Star,
  ChevronRight,
  Loader2,
} from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    message: ''
  });

  const handleTrialSignup = async (planName = 'Trial') => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setIsSubmitting(true);
    try {
      // Create lead for trial signup
      await base44.integrations.Core.SendEmail({
        to: 'sales@loangenius.ai',
        subject: `New Trial Signup: ${planName}`,
        body: `New trial signup request:\n\nEmail: ${email}\nPlan: ${planName}\nDate: ${new Date().toLocaleString()}`
      });
      setSelectedPlan(planName);
      setShowSuccessDialog(true);
      setEmail('');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetStarted = (planName) => {
    if (planName === 'Enterprise') {
      setSelectedPlan(planName);
      setShowContactDialog(true);
    } else {
      setSelectedPlan(planName);
      setShowSuccessDialog(true);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: 'sales@loangenius.ai',
        subject: `Enterprise Inquiry from ${contactForm.name}`,
        body: `New enterprise inquiry:\n\nName: ${contactForm.name}\nEmail: ${contactForm.email}\nCompany: ${contactForm.company}\nPhone: ${contactForm.phone}\n\nMessage:\n${contactForm.message}`
      });
      setShowContactDialog(false);
      toast.success('Thank you! Our team will contact you within 24 hours.');
      setContactForm({ name: '', email: '', company: '', phone: '', message: '' });
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Intelligence',
      description: 'Leverage cutting-edge AI to automate document processing, underwriting, and compliance checks in seconds.',
    },
    {
      icon: Zap,
      title: 'Lightning Fast Processing',
      description: 'Close loans 10x faster with automated workflows that eliminate manual data entry and repetitive tasks.',
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: 'Enterprise-level encryption and compliance with all lending regulations including TRID, HMDA, and ECOA.',
    },
    {
      icon: TrendingUp,
      title: 'Pipeline Management',
      description: 'Visual pipeline with real-time insights, automated reminders, and intelligent lead scoring.',
    },
    {
      icon: Users,
      title: 'Borrower Portal',
      description: 'Branded portal where borrowers can upload documents, track progress, and communicate securely.',
    },
    {
      icon: FileText,
      title: 'Smart Documentation',
      description: 'Auto-generate MISMO, FNMA, and all required forms with intelligent data extraction from documents.',
    },
  ];

  const stats = [
    { value: '10x', label: 'Faster Processing' },
    { value: '95%', label: 'Time Saved' },
    { value: '24/7', label: 'AI Support' },
    { value: '100%', label: 'Compliant' },
  ];

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Senior Loan Officer',
      company: 'Pacific Lending Group',
      quote: 'LoanGenius transformed our operation. We went from 45 days to close to just 12 days, and our team loves the automation.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Broker Owner',
      company: 'Elite Mortgage Solutions',
      quote: 'The AI document intelligence alone is worth it. It catches errors before they become problems and saves us thousands in compliance costs.',
      rating: 5,
    },
    {
      name: 'Jennifer Rodriguez',
      role: 'Operations Manager',
      company: 'Nationwide Home Loans',
      quote: 'Our loan officers can now handle 3x more volume without adding staff. The ROI was immediate.',
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$299',
      period: '/month',
      description: 'Perfect for solo loan officers',
      features: [
        'Up to 25 loans/month',
        'AI Document Processing',
        'Borrower Portal',
        'Basic Analytics',
        'Email Support',
      ],
    },
    {
      name: 'Professional',
      price: '$799',
      period: '/month',
      description: 'For growing teams',
      features: [
        'Up to 100 loans/month',
        'Advanced AI Underwriting',
        'Custom Branding',
        'Advanced Analytics',
        'Priority Support',
        'API Access',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large operations',
      features: [
        'Unlimited loans',
        'White-Label Solution',
        'Dedicated AI Training',
        'Custom Integrations',
        '24/7 Phone Support',
        'Dedicated Account Manager',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">LoanGenius</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-300 hover:text-white transition">Features</a>
              <a href="#testimonials" className="text-slate-300 hover:text-white transition">Testimonials</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition">Pricing</a>
              <a href="https://app.loangenius.ai" className="text-slate-300 hover:text-white transition">Sign In</a>
              <Button 
                className="bg-blue-600 hover:bg-blue-500"
                onClick={() => window.location.href = 'https://app.loangenius.ai'}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Loan Origination Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Close Loans 10x Faster<br />
            With <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AI Automation</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-3xl mx-auto">
            The only loan origination system designed for DSCR and business purpose loans. 
            Automate document processing, underwriting, and compliance while delighting borrowers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 w-64"
              />
              <Button 
                className="bg-blue-600 hover:bg-blue-500 gap-2"
                onClick={() => handleTrialSignup('Free Trial')}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Start Free Trial <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-4">No credit card required • 14-day free trial • Setup in 5 minutes</p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need to Scale</h2>
            <p className="text-slate-400 text-lg">Built specifically for DSCR and business purpose lending professionals</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-all group">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition">
                    <feature.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Loan Professionals</h2>
            <p className="text-slate-400 text-lg">Join thousands of successful loan officers and brokers</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 italic">"{testimonial.quote}"</p>
                  <div>
                    <div className="font-semibold text-white">{testimonial.name}</div>
                    <div className="text-sm text-slate-400">{testimonial.role}</div>
                    <div className="text-sm text-blue-400">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 text-lg">Start free, scale as you grow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => (
              <Card key={idx} className={`${plan.popular ? 'bg-gradient-to-b from-blue-600/20 to-slate-800/50 border-blue-500' : 'bg-slate-800/50 border-slate-700'} relative`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">Most Popular</span>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 mb-6">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-slate-400">{plan.period}</span>
                  </div>
                  <Button 
                    className={`w-full mb-6 ${plan.popular ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                    onClick={() => handleGetStarted(plan.name)}
                  >
                    {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-300">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0">
            <CardContent className="p-12">
              <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Business?</h2>
              <p className="text-blue-100 text-lg mb-8">Join thousands of loan professionals already using LoanGenius</p>
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-slate-100 gap-2"
                onClick={() => window.location.href = 'https://app.loangenius.ai'}
              >
                Start Your Free Trial <ChevronRight className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">LoanGenius</span>
              </div>
              <p className="text-slate-400 text-sm">AI-powered loan origination for modern lenders</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="https://apply.loangenius.ai" className="hover:text-white">Apply for Loan</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-400 text-sm">
            <p>© 2026 LoanGenius. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Contact Our Enterprise Team</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tell us about your needs and we'll create a custom solution for you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Name</Label>
                <Input
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Company</Label>
                <Input
                  required
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Message</Label>
              <Textarea
                required
                placeholder="Tell us about your loan volume, team size, and specific needs..."
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white min-h-24"
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Inquiry
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white text-center">
          <div className="py-6">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <DialogTitle className="text-2xl mb-2">You're Almost There!</DialogTitle>
            <DialogDescription className="text-slate-400 mb-6">
              {selectedPlan === 'Free Trial' 
                ? "We've received your signup request. Click below to create your account and start your 14-day free trial."
                : `Great choice! Click below to start your ${selectedPlan} plan with a 14-day free trial.`}
            </DialogDescription>
            <Button 
              className="bg-blue-600 hover:bg-blue-500 w-full"
              onClick={() => window.location.href = 'https://app.loangenius.ai'}
            >
              Create Your Account <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}