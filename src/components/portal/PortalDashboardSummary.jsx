import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp,
  FileText, DollarSign, Home, Sparkles
} from 'lucide-react';

export default function PortalDashboardSummary({ deal, nextSteps = [], keyDates = [] }) {
  const getStageInfo = (stage) => {
    const stages = {
      inquiry: { label: 'Initial Inquiry', color: 'bg-gray-100 text-gray-700', progress: 10 },
      application: { label: 'Application', color: 'bg-blue-100 text-blue-700', progress: 25 },
      processing: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', progress: 40 },
      underwriting: { label: 'Underwriting', color: 'bg-purple-100 text-purple-700', progress: 60 },
      approved: { label: 'Approved', color: 'bg-green-100 text-green-700', progress: 80 },
      closing: { label: 'Closing', color: 'bg-teal-100 text-teal-700', progress: 90 },
      funded: { label: 'Funded', color: 'bg-emerald-100 text-emerald-700', progress: 100 }
    };
    return stages[stage] || stages.inquiry;
  };

  const stageInfo = getStageInfo(deal?.stage);

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Loan Application
                </h2>
                <p className="text-gray-600 mt-1">
                  {deal?.deal_number || 'In Progress'}
                </p>
              </div>
              <Badge className={stageInfo.color + ' text-sm px-3 py-1'}>
                {stageInfo.label}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-semibold text-gray-900">{stageInfo.progress}%</span>
              </div>
              <Progress value={stageInfo.progress} className="h-3" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-gray-500">Loan Amount</p>
                <p className="font-bold text-gray-900">
                  ${((deal?.loan_amount || 0) / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="text-center">
                <Home className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-xs text-gray-500">Product</p>
                <p className="font-bold text-gray-900">
                  {deal?.loan_product || 'DSCR'}
                </p>
              </div>
              <div className="text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-gray-500">Applied</p>
                <p className="font-bold text-gray-900">
                  {deal?.application_date 
                    ? new Date(deal.application_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Recent'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextSteps.length > 0 ? (
            nextSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{step.title}</p>
                  {step.description && (
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  )}
                  {step.due_date && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(step.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-gray-600">You're all caught up!</p>
              <p className="text-xs text-gray-500 mt-1">We'll notify you when action is needed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Dates */}
      {keyDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              Important Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keyDates.map((date, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-purple-600">
                      {new Date(date.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-purple-900">
                      {new Date(date.date).getDate()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{date.label}</p>
                    {date.description && (
                      <p className="text-xs text-gray-500">{date.description}</p>
                    )}
                  </div>
                </div>
                {date.status === 'upcoming' && (
                  <Badge variant="outline" className="text-purple-600">Scheduled</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}