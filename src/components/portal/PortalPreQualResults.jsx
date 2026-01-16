import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Sparkles, TrendingUp, DollarSign } from 'lucide-react';

export default function PortalPreQualResults({ preQuals = [] }) {
  const latestPreQual = preQuals[0];

  if (!latestPreQual) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="font-semibold text-gray-900 mb-2">No Pre-Qualification Results</h3>
          <p className="text-gray-500">Complete a pre-qualification check to see results here</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (latestPreQual.status) {
      case 'passed':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'needs_review':
        return <AlertCircle className="h-12 w-12 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Sparkles className="h-12 w-12 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (latestPreQual.status) {
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'needs_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="border-2">
        <CardContent className="py-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h2 className="text-2xl font-bold mb-2">Pre-Qualification Result</h2>
            <Badge className={`${getStatusColor()} text-lg px-4 py-1`}>
              {latestPreQual.status?.replace('_', ' ').toUpperCase()}
            </Badge>
            <p className="text-sm text-gray-500 mt-4">
              Evaluated on {new Date(latestPreQual.created_date).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              Loan Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${(latestPreQual.loan_amount_requested || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              LTV Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestPreQual.ltv_ratio?.toFixed(1) || '—'}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              DSCR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {latestPreQual.dscr_ratio?.toFixed(2) || '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checks Passed/Failed */}
      {(latestPreQual.checks_passed?.length > 0 || latestPreQual.checks_failed?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {latestPreQual.checks_passed?.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Passed Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {latestPreQual.checks_passed.map((check, idx) => (
                    <li key={idx} className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      {check}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {latestPreQual.checks_failed?.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {latestPreQual.checks_failed.map((check, idx) => (
                    <li key={idx} className="text-sm text-red-800 flex items-center gap-2">
                      <XCircle className="h-3 w-3" />
                      {check}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* AI Recommendation */}
      {latestPreQual.ai_recommendation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700">{latestPreQual.ai_recommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {latestPreQual.next_steps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {latestPreQual.next_steps.map((step, idx) => (
                <li key={idx} className="text-sm text-gray-700">{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}