import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, Clock, Calendar, DollarSign, 
  Home, User, TrendingUp, AlertCircle, ArrowRight
} from 'lucide-react';

const stageConfig = {
  inquiry: { step: 1, label: 'Inquiry', color: 'bg-slate-500' },
  application: { step: 2, label: 'Application', color: 'bg-blue-500' },
  processing: { step: 3, label: 'Processing', color: 'bg-purple-500' },
  underwriting: { step: 4, label: 'Underwriting', color: 'bg-orange-500' },
  approved: { step: 5, label: 'Approved', color: 'bg-green-500' },
  closing: { step: 6, label: 'Closing', color: 'bg-emerald-500' },
  funded: { step: 7, label: 'Funded', color: 'bg-green-600' },
  denied: { step: 0, label: 'Denied', color: 'bg-red-500' },
  withdrawn: { step: 0, label: 'Withdrawn', color: 'bg-gray-500' },
};

const TIMELINE_STAGES = ['application', 'processing', 'underwriting', 'approved', 'closing', 'funded'];

export default function PortalLoanSummary({ deal, borrower, property }) {
  const currentStage = stageConfig[deal?.stage] || stageConfig.inquiry;
  const currentStageIndex = TIMELINE_STAGES.indexOf(deal?.stage);
  const progressPercent = deal?.stage === 'funded' ? 100 : 
    currentStageIndex >= 0 ? Math.round(((currentStageIndex + 1) / TIMELINE_STAGES.length) * 100) : 10;

  // Calculate estimated closing date
  const getEstimatedClosingDate = () => {
    if (deal?.closing_date) {
      return new Date(deal.closing_date);
    }
    // Estimate based on stage
    const today = new Date();
    const daysToAdd = {
      inquiry: 45,
      application: 40,
      processing: 30,
      underwriting: 21,
      approved: 14,
      closing: 7,
      funded: 0,
    };
    const days = daysToAdd[deal?.stage] || 30;
    return new Date(today.setDate(today.getDate() + days));
  };

  const estimatedClosing = getEstimatedClosingDate();
  const daysUntilClosing = Math.max(0, Math.ceil((estimatedClosing - new Date()) / (1000 * 60 * 60 * 24)));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card className="overflow-hidden">
        <div className={`h-2 ${currentStage.color}`} />
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Loan Status</h2>
              <p className="text-slate-500 mt-1">Track your loan progress</p>
            </div>
            <Badge className={`${currentStage.color} text-white px-4 py-2 text-base`}>
              {currentStage.label}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>Application Started</span>
              <span className="font-medium text-slate-900">{progressPercent}% Complete</span>
              <span>Closing</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="flex justify-between">
              {TIMELINE_STAGES.map((stage, index) => {
                const config = stageConfig[stage];
                const isComplete = currentStageIndex > index;
                const isCurrent = currentStageIndex === index;
                const isPending = currentStageIndex < index;

                return (
                  <div key={stage} className="flex flex-col items-center relative z-10">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isComplete ? 'bg-green-500 border-green-500' :
                      isCurrent ? `${config.color} border-current` :
                      'bg-white border-slate-300'
                    }`}>
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : isCurrent ? (
                        <Clock className="h-5 w-5 text-white animate-pulse" />
                      ) : (
                        <span className="text-sm text-slate-400">{index + 1}</span>
                      )}
                    </div>
                    <p className={`text-xs mt-2 text-center ${
                      isComplete || isCurrent ? 'text-slate-900 font-medium' : 'text-slate-400'
                    }`}>
                      {config.label}
                    </p>
                  </div>
                );
              })}
            </div>
            {/* Connecting Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 -z-10" style={{ width: 'calc(100% - 40px)', marginLeft: '20px' }}>
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: `${Math.max(0, (currentStageIndex / (TIMELINE_STAGES.length - 1)) * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Loan Amount</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(deal?.loan_amount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Interest Rate</p>
                <p className="text-xl font-bold text-slate-900">
                  {deal?.interest_rate ? `${deal.interest_rate}%` : 'TBD'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Est. Closing</p>
                <p className="text-xl font-bold text-slate-900">
                  {estimatedClosing.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Days to Close</p>
                <p className="text-xl font-bold text-slate-900">
                  {deal?.stage === 'funded' ? 'Complete!' : `${daysUntilClosing} days`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loan Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Product</span>
              <span className="font-medium">{deal?.loan_product || 'DSCR'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Purpose</span>
              <span className="font-medium">{deal?.loan_purpose || 'Purchase'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Term</span>
              <span className="font-medium">{deal?.loan_term_months ? `${deal.loan_term_months / 12} Years` : '30 Years'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">LTV</span>
              <span className="font-medium">{deal?.ltv ? `${deal.ltv.toFixed(1)}%` : 'TBD'}</span>
            </div>
            {deal?.dscr && (
              <div className="flex justify-between py-2">
                <span className="text-slate-500">DSCR</span>
                <span className="font-medium">{deal.dscr.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-green-600" />
              Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            {property ? (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-500 text-sm">Address</p>
                  <p className="font-medium">
                    {property.address_street}
                    {property.address_unit && `, ${property.address_unit}`}
                  </p>
                  <p className="text-slate-600">
                    {property.address_city}, {property.address_state} {property.address_zip}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-slate-500 text-sm">Property Type</p>
                    <p className="font-medium">{property.property_type || 'SFR'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm">Value</p>
                    <p className="font-medium">{formatCurrency(property.estimated_value || deal?.appraised_value)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Property details loading...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-blue-600" />
            What's Next?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deal?.stage === 'application' && (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">
                  Please upload any remaining documents in the Documents tab. Once complete, your file 
                  will move to processing.
                </p>
              </div>
            )}
            {deal?.stage === 'processing' && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">
                  Our team is reviewing your application. We may reach out if additional documents are needed.
                  Average processing time is 3-5 business days.
                </p>
              </div>
            )}
            {deal?.stage === 'underwriting' && (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">
                  Your loan is with our underwriting team. Check the Conditions tab for any items that 
                  need your attention.
                </p>
              </div>
            )}
            {deal?.stage === 'approved' && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">
                  Congratulations! Your loan is approved. We're preparing your closing documents. 
                  You'll be contacted to schedule your closing appointment.
                </p>
              </div>
            )}
            {deal?.stage === 'closing' && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">
                  Your closing is scheduled! Please review all documents carefully and bring valid 
                  photo ID to your closing appointment.
                </p>
              </div>
            )}
            {deal?.stage === 'funded' && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">
                  🎉 Your loan has funded! Thank you for choosing us. You'll receive your first 
                  payment statement from your servicer soon.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}