import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PipelineChart({ data }) {
  const maxCount = Math.max(...(data?.map(d => d.count) || [1]));
  const maxWidth = 300;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.map(stage => (
          <div key={stage.stage}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium capitalize text-gray-700">{stage.stage}</span>
              <span className="text-sm font-semibold text-gray-900">{stage.count}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stage.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">${(stage.volume / 1000000).toFixed(1)}M</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}