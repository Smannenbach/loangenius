import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Clock, Calendar, DollarSign, Home, FileText,
  ArrowRight, AlertTriangle, TrendingUp, User, Sparkles
} from 'lucide-react';

const stageConfig = {
  inquiry: { step: 1, label: 'Inquiry', color: 'bg-slate-500', progress: 10 },
  application: { step: 2, label: 'Application', color: 'bg-blue-500', progress: 25 },
  processing: { step: 3, label: 'Processing', color: 'bg-purple-500', progress: 45 },
  underwriting: { step: 4, label: 'Underwriting', color: 'bg-orange-500', progress: 65 },
  approved: { step: 5, label: 'Approved', color: 'bg-green-500', progress: 80 },
  closing: { step: 6, label: 'Closing', color: 'bg-emerald-500', progress: 95 },
  funded: { step: 7, label: 'Funded', color: 'bg-green-600', progress: 100 },
  denied: { step: 0, label: 'Denied', color: 'bg-red-500', progress: 0 },
  withdrawn: { step: 0, label: 'Withdrawn', color: 'bg-gray-500', progress: 0 },
};

const nextStepsContent = {
  inquiry: {
    icon: FileText,
    title: 'Complete Your Application',
    description: 'Fill out the loan application to get started. Our team will review and contact you within 24 hours.',
    action: 'Start Application',
  },
  application: {
    icon: FileText,
    title: 'Upload Required Documents',
    description: 'Please upload the required documents in the Documents tab. This helps us process your application faster.',
    action: 'View Documents',
  },
  processing: {
    icon: Clock,
    title: 'Application Under Review',
    description: 'Our team is reviewing your application. Average processing time is 3-5 business days. We may reach out for additional information.',
    action: null,
  },
  underwriting: {
    icon: TrendingUp,
    title: 'Underwriting in Progress',
    description: 'Your loan is being underwritten. Please check the Conditions tab for any items needing your attention.',
    action: 'View Conditions',
  },
  approved: {
    icon: CheckCircle2,
    title: 'Congratulations! Loan Approved',
    description: 'Your loan has been approved! We\'re preparing closing documents. You\'ll be contacted to schedule closing.',
    action: null,
  },
  closing: {
    icon: Calendar,
    title: 'Closing Scheduled',
    description: 'Your closing has been scheduled. Please review all documents and bring valid photo ID to your appointment.',
    action: 'View Details',
  },
  funded: {
    icon: Sparkles,
    title: 'Loan Funded! 🎉',
    description: 'Congratulations! Your loan has funded. You\'ll receive your first payment statement from your servicer soon.',
    action: null,
  },
};

export default function PortalDashboard({ 
  deal, 
  borrower, 
  property, 
  pendingDocs = 0,
  pendingConditions = 0,
  unreadMessages = 0,
  onNavigate 
}) {
  const currentStage = stageConfig[deal?.stage] || stageConfig.inquiry;
  const nextSteps = nextStepsContent[deal?.stage] || nextStepsContent.inquiry;
  const NextIcon = nextSteps.icon;

  // Calculate estimated closing
  const getEstimatedClosing = () => {
    if (deal?.closing_date) return new Date(deal.closing_date);
    const today = new Date();
    const daysMap = { inquiry: 45, application: 40, processing: 30, underwriting: 21, approved: 14, closing: 7, funded: 0 };
    return new Date(today.setDate(today.getDate() + (daysMap[deal?.stage] || 30)));
  };

  const estimatedClosing = getEstimatedClosing();
  const daysToClose = Math.max(0, Math.ceil((estimatedClosing - new Date()) / (1000 * 60 * 60 * 24)));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Welcome back, {borrower?.first_name || 'Borrower'}!
              </h2>
              <p className="text-blue-100">
                Your loan application is in <span className="font-semibold text-white">{currentStage.label}</span> stage
              </p>
            </div>
            <Badge className="bg-white/20 text-white hover:bg-white/30">
              {deal?.deal_number || 'Draft'}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-blue-100 mb-2">
              <span>Application Progress</span>
              <span className="text-white font-medium">{currentStage.progress}%</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${currentStage.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Required Alerts */}
      {(pendingDocs > 0 || pendingConditions > 0 || unreadMessages > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pendingDocs > 0 && (
            <Card className="border-amber-200 bg-amber-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('status')}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">{pendingDocs} Document{pendingDocs > 1 ? 's' : ''} Needed</p>
                    <p className="text-xs text-amber-700">Upload to continue</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          )}
          {pendingConditions > 0 && (
            <Card className="border-orange-200 bg-orange-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('conditions')}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900">{pendingConditions} Condition{pendingConditions > 1 ? 's' : ''}</p>
                    <p className="text-xs text-orange-700">Review required</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          )}
          {unreadMessages > 0 && (
            <Card className="border-purple-200 bg-purple-50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate?.('messages')}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900">{unreadMessages} New Message{unreadMessages > 1 ? 's' : ''}</p>
                    <p className="text-xs text-purple-700">From your loan team</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-purple-400" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Loan Amount</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(deal?.loan_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Interest Rate</p>
                <p className="text-lg font-bold text-gray-900">{deal?.interest_rate ? `${deal.interest_rate}%` : 'TBD'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Est. Closing</p>
                <p className="text-lg font-bold text-gray-900">
                  {deal?.stage === 'funded' ? 'Complete!' : estimatedClosing.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Days to Close</p>
                <p className="text-lg font-bold text-gray-900">{deal?.stage === 'funded' ? '—' : `${daysToClose} days`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps Card */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <NextIcon className={`h-5 w-5 ${deal?.stage === 'funded' ? 'text-green-600' : 'text-blue-600'}`} />
            {nextSteps.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{nextSteps.description}</p>
          {nextSteps.action && (
            <Button 
              onClick={() => {
                if (nextSteps.action === 'View Documents') onNavigate?.('status');
                else if (nextSteps.action === 'View Conditions') onNavigate?.('conditions');
                else if (nextSteps.action === 'View Details') onNavigate?.('summary');
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {nextSteps.action}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Loan & Property Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Product</span>
              <span className="font-medium text-sm">{deal?.loan_product || 'DSCR'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Purpose</span>
              <span className="font-medium text-sm">{deal?.loan_purpose || 'Purchase'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500 text-sm">Term</span>
              <span className="font-medium text-sm">{deal?.loan_term_months ? `${deal.loan_term_months / 12} Years` : '30 Years'}</span>
            </div>
            {deal?.ltv && (
              <div className="flex justify-between py-2">
                <span className="text-gray-500 text-sm">LTV</span>
                <span className="font-medium text-sm">{deal.ltv.toFixed(1)}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Home className="h-4 w-4 text-green-600" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            {property ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">{property.address_street}</p>
                  <p className="text-gray-500 text-sm">{property.address_city}, {property.address_state} {property.address_zip}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-gray-500 text-xs">Type</p>
                    <p className="font-medium text-sm">{property.property_type || 'SFR'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Value</p>
                    <p className="font-medium text-sm">{formatCurrency(property.estimated_value || deal?.appraised_value)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Property details pending</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}