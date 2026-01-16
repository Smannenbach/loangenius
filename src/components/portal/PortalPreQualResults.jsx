import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, XCircle, AlertTriangle, Sparkles, 
  TrendingUp, DollarSign, Home, ArrowRight, Clock
} from 'lucide-react';

export default function PortalPreQualResults({ preQuals }) {
  const latestPreQual = preQuals?.[0];

  if (!latestPreQual) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-16 text-center">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-purple-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Get Pre-Qualified</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Find out if you qualify for a loan in just 3 minutes. No credit check required for initial pre-qualification.
          </p>
          <Link to={createPageUrl('BorrowerOnboarding')}>
            <Button size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-5 w-5" />
              Start Pre-Qualification
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case 'passed':
        return {
          icon: CheckCircle2,
          color: 'green',
          title: 'Congratulations! You Pre-Qualify',
          bg: 'from-green-50 to-emerald-50',
          border: 'border-green-200'
        };
      case 'needs_review':
        return {
          icon: AlertTriangle,
          color: 'yellow',
          title: 'Pre-Qualification Needs Review',
          bg: 'from-yellow-50 to-amber-50',
          border: 'border-yellow-200'
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'red',
          title: 'Pre-Qualification Not Met',
          bg: 'from-red-50 to-pink-50',
          border: 'border-red-200'
        };
      default:
        return {
          icon: Clock,
          color: 'gray',
          title: 'Pre-Qualification Pending',
          bg: 'from-gray-50 to-slate-50',
          border: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig(latestPreQual.status);
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={`bg-gradient-to-br ${config.bg} border-2 ${config.border}`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`h-16 w-16 rounded-full bg-${config.color}-100 flex items-center justify-center`}>
              <StatusIcon className={`h-8 w-8 text-${config.color}-600`} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{config.title}</h2>
              <p className="text-gray-600">
                Based on the information you provided on{' '}
                {new Date(latestPreQual.created_date).toLocaleDateString()}
              </p>
              {latestPreQual.expires_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Valid until {new Date(latestPreQual.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{latestPreQual.ltv_ratio?.toFixed(1) || 'N/A'}%</p>
            <p className="text-sm text-gray-500">LTV Ratio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{latestPreQual.dscr_ratio?.toFixed(2) || 'N/A'}</p>
            <p className="text-sm text-gray-500">DSCR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Home className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">${(latestPreQual.loan_amount_requested || 0).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Loan Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{latestPreQual.ai_confidence_score || 85}%</p>
            <p className="text-sm text-gray-500">Confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Checks Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Passed Checks */}
        {latestPreQual.checks_passed?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Passed Checks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {latestPreQual.checks_passed.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Warnings & Failed */}
        {(latestPreQual.checks_warnings?.length > 0 || latestPreQual.checks_failed?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Areas of Concern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {latestPreQual.checks_warnings?.map((check, idx) => (
                  <li key={`warn-${idx}`} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
                {latestPreQual.checks_failed?.map((check, idx) => (
                  <li key={`fail-${idx}`} className="flex items-start gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Recommendation */}
      {latestPreQual.ai_recommendation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Our Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{latestPreQual.ai_recommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {latestPreQual.next_steps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {latestPreQual.next_steps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Link to={createPageUrl('BorrowerOnboarding')} className="flex-1">
          <Button className="w-full gap-2" size="lg">
            Continue Application
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to={createPageUrl('BorrowerOnboarding')}>
          <Button variant="outline" size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Re-Check
          </Button>
        </Link>
      </div>
    </div>
  );
}