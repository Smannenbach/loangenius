import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportResults({ report, loading }) {
  if (loading) {
    return (
      <Card className="bg-white">
        <CardContent className="p-6">
          <p className="text-gray-500">Loading report...</p>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return null;
  }

  const { by_group, funnel, by_stage, credit_score_distribution } = report;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Report Results</CardTitle>
        <p className="text-xs text-gray-500 mt-2">
          Generated at {new Date(report.generated_at).toLocaleString()} ({report.execution_ms}ms)
        </p>
      </CardHeader>
      <CardContent>
        {/* Production/By Group */}
        {by_group && (
          <div>
            <h3 className="font-semibold mb-3">Results by Group</h3>
            <div className="space-y-2">
              {by_group.map((group, idx) => (
                <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{group.group}</span>
                  <span>
                    {group.count} deals · ${(group.volume / 1000000).toFixed(2)}M
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Funnel */}
        {funnel && (
          <div>
            <h3 className="font-semibold mb-3">Conversion Funnel</h3>
            <div className="space-y-2">
              {funnel.map((stage, idx) => (
                <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{stage.stage}</span>
                  <span>
                    {stage.count} → {stage.conversion_rate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline by Stage */}
        {by_stage && (
          <div>
            <h3 className="font-semibold mb-3">Pipeline by Stage</h3>
            <div className="space-y-2">
              {by_stage.map((stage, idx) => (
                <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{stage.stage}</span>
                  <span>
                    {stage.count} deals · {stage.avg_days_in_stage} avg days
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credit Score Distribution */}
        {credit_score_distribution && (
          <div>
            <h3 className="font-semibold mb-3">Credit Score Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 bg-green-50 rounded">
                <span>Excellent (750+)</span>
                <span>{credit_score_distribution.excellent}</span>
              </div>
              <div className="flex justify-between p-2 bg-blue-50 rounded">
                <span>Good (700-749)</span>
                <span>{credit_score_distribution.good}</span>
              </div>
              <div className="flex justify-between p-2 bg-yellow-50 rounded">
                <span>Fair (650-699)</span>
                <span>{credit_score_distribution.fair}</span>
              </div>
              <div className="flex justify-between p-2 bg-red-50 rounded">
                <span>Poor (&lt;650)</span>
                <span>{credit_score_distribution.poor}</span>
              </div>
              <div className="flex justify-between p-2 bg-gray-100 rounded font-semibold">
                <span>Average Score</span>
                <span>{credit_score_distribution.avg_score}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}