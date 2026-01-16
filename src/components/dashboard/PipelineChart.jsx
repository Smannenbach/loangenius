import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight } from 'lucide-react';

const stageColors = {
  inquiry: 'bg-gray-500',
  application: 'bg-blue-500',
  processing: 'bg-yellow-500',
  underwriting: 'bg-purple-500',
  approved: 'bg-indigo-500',
  closing: 'bg-teal-500',
  funded: 'bg-green-500',
  denied: 'bg-red-500',
  withdrawn: 'bg-orange-500',
};

export default function PipelineChart({ data }) {
  const maxCount = Math.max(...(data?.map(d => d.count) || [1]), 1);

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold">Pipeline by Stage</CardTitle>
        <Link to={createPageUrl('Pipeline')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!data || data.length === 0) ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-2">No deals in pipeline yet</p>
            <Link 
              to={createPageUrl('LoanApplicationWizard')} 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first deal →
            </Link>
          </div>
        ) : data.map(stage => (
          <Link 
            key={stage.stage} 
            to={createPageUrl('Pipeline')}
            className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
          >
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium capitalize text-gray-700">{stage.stage?.replace(/_/g, ' ')}</span>
              <span className="text-sm font-semibold text-gray-900">{stage.count} deals</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`${stageColors[stage.stage] || 'bg-blue-600'} h-2.5 rounded-full transition-all duration-300`}
                style={{ width: `${Math.max((stage.count / maxCount) * 100, 5)}%` }}
              />
            </div>
            {stage.volume !== undefined && (
              <div className="text-xs text-gray-500 mt-1">
                ${stage.volume >= 1000000 ? (stage.volume / 1000000).toFixed(1) + 'M' : (stage.volume / 1000).toFixed(0) + 'K'}
              </div>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}