import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PipelineChart({ data }) {
  const chartData = [
    { stage: 'Draft', deals: data?.draft || 0, value: 0 },
    { stage: 'In Progress', deals: data?.in_progress || 0, value: 0 },
    { stage: 'Submitted', deals: data?.submitted || 0, value: 0 },
    { stage: 'Completed', deals: data?.completed || 0, value: 0 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="deals" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}